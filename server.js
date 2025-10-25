const mqtt = require('mqtt');
const admin = require('firebase-admin');
const express = require('express');
require('dotenv').config();

// ============================================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================================

let db;

try {
  let serviceAccount;
  
  // En Railway/producción: leer desde variable de entorno
  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    console.log('✅ Using Firebase credentials from environment variable');
  } 
  // En desarrollo local: leer desde archivo
  else {
    serviceAccount = require('./serviceAccountKey.json');
    console.log('✅ Using Firebase credentials from local file');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error loading Firebase credentials:', error.message);
  console.log('⚠️  Check your Firebase configuration');
  console.log('   Local: Ensure serviceAccountKey.json exists');
  console.log('   Railway: Set FIREBASE_CREDENTIALS environment variable');
  process.exit(1);
}

// ============================================================================
// CONFIGURACIÓN DE EXPRESS
// ============================================================================

const app = express();
app.use(express.json());

// CORS para desarrollo (opcional)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ============================================================================
// CONFIGURACIÓN DE MQTT
// ============================================================================

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'siav/eventos/test';

const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: `siav-backend-${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 30000
});

// ============================================================================
// MQTT EVENT HANDLERS
// ============================================================================

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT Broker:', MQTT_BROKER);
  mqttClient.subscribe(MQTT_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Subscription error:', err);
    } else {
      console.log(`📩 Subscribed to topic: ${MQTT_TOPIC} (QoS 1)`);
    }
  });
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT Connection error:', error);
});

mqttClient.on('reconnect', () => {
  console.log('🔄 Reconnecting to MQTT Broker...');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const evento = JSON.parse(message.toString());
    console.log(`\n📨 Received event from ${topic}:`);
    console.log(`   Device: ${evento.dispositivo_id}`);
    console.log(`   Speed: ${evento.velocidad} km/h`);
    console.log(`   Direction: ${evento.direccion}`);
    console.log(`   Infraction: ${evento.esInfraccion ? '🚨 YES' : '✅ NO'}`);
    
    // Escribir en Firestore
    const docRef = await db.collection('eventos_trafico').add({
      ...evento,
      procesado: false,
      recibidoEn: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Event saved to Firestore: ${docRef.id}`);
    
    // Si es infracción, crear registro especial
    if (evento.esInfraccion) {
      await db.collection('infracciones').add({
        eventoId: docRef.id,
        velocidad: evento.velocidad,
        direccion: evento.direccion,
        ubicacion: evento.ubicacion,
        dispositivo_id: evento.dispositivo_id,
        timestamp: evento.timestamp,
        limiteVelocidad: evento.limiteVelocidad,
        notificada: false,
        creadoEn: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('🚨 Infraction record created');
    }
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
  }
});

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'SIAV Backend Running',
    version: '1.0.0',
    mqtt: {
      connected: mqttClient.connected,
      broker: MQTT_BROKER,
      topic: MQTT_TOPIC
    },
    firebase: {
      connected: !!db
    },
    uptime: process.uptime()
  });
});

// Obtener estadísticas en tiempo real
app.get('/stats', async (req, res) => {
  try {
    const [eventosSnapshot, infraccionesSnapshot] = await Promise.all([
      db.collection('eventos_trafico').count().get(),
      db.collection('infracciones').count().get()
    ]);
    
    res.json({
      totalEventos: eventosSnapshot.data().count,
      totalInfracciones: infraccionesSnapshot.data().count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener últimos eventos
app.get('/eventos/recientes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const snapshot = await db.collection('eventos_trafico')
      .orderBy('recibidoEn', 'desc')
      .limit(limit)
      .get();
    
    const eventos = [];
    snapshot.forEach(doc => {
      eventos.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar reporte diario
app.get('/generar-reporte', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const [year, month, day] = fecha.split('-');
    
    const inicio = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const fin = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    
    console.log(`\n📊 Generating report for ${fecha}...`);
    
    const snapshot = await db.collection('eventos_trafico')
      .where('timestamp', '>=', inicio.toISOString())
      .where('timestamp', '<=', fin.toISOString())
      .get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        message: 'No events found for this date',
        fecha,
        totalEventos: 0
      });
    }
    
    let totalEventos = 0;
    let totalInfracciones = 0;
    let velocidades = [];
    let direcciones = { norte: 0, sur: 0 };
    
    snapshot.forEach(doc => {
      const evento = doc.data();
      totalEventos++;
      if (evento.esInfraccion) totalInfracciones++;
      velocidades.push(evento.velocidad);
      if (evento.direccion === 'norte') direcciones.norte++;
      else direcciones.sur++;
    });
    
    const velocidadPromedio = velocidades.reduce((a, b) => a + b, 0) / velocidades.length;
    const velocidadMaxima = Math.max(...velocidades);
    const velocidadMinima = Math.min(...velocidades);
    
    const reporte = {
      fecha: admin.firestore.Timestamp.fromDate(inicio),
      totalEventos,
      totalInfracciones,
      porcentajeInfracciones: ((totalInfracciones / totalEventos) * 100).toFixed(2),
      velocidadPromedio: Math.round(velocidadPromedio * 100) / 100,
      velocidadMaxima,
      velocidadMinima,
      direcciones,
      generadoEn: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('reportes_diarios').doc(fecha).set(reporte);
    
    console.log(`✅ Report generated: ${totalEventos} events, ${totalInfracciones} infractions`);
    
    res.json({
      success: true,
      fecha,
      ...reporte
    });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener reportes históricos
app.get('/reportes', async (req, res) => {
  try {
    const snapshot = await db.collection('reportes_diarios')
      .orderBy('fecha', 'desc')
      .limit(30)
      .get();
    
    const reportes = [];
    snapshot.forEach(doc => {
      reportes.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(reportes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINTS ADICIONALES PARA INTEGRACIÓN CON DASHBOARD
// ============================================================================
// Agregar estos endpoints después de los existentes en server.js

// Endpoint compatible con el dashboard: /api/eventos
app.get('/api/eventos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const snapshot = await db.collection('eventos_trafico')
      .orderBy('recibidoEn', 'desc')
      .limit(limit)
      .get();
    
    const eventos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Transformar al formato esperado por el frontend
      eventos.push({
        id: doc.id,
        timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
        velocidad: data.velocidad || 0,
        direccion: data.direccion || 'N/A',
        ubicacion: data.ubicacion || {
          lat: -0.9549,
          lng: -80.7288,
          nombre: 'Ubicación desconocida'
        },
        esInfraccion: data.esInfraccion || false,
        limiteVelocidad: data.limiteVelocidad || 50,
        fecha: data.timestamp || new Date().toISOString(),
        dispositivo_id: data.dispositivo_id
      });
    });
    
    res.json(eventos);
  } catch (error) {
    console.error('Error en /api/eventos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de estadísticas compatible con el dashboard
app.get('/api/estadisticas', async (req, res) => {
  try {
    // Obtener últimos 100 eventos para calcular estadísticas
    const snapshot = await db.collection('eventos_trafico')
      .orderBy('recibidoEn', 'desc')
      .limit(100)
      .get();
    
    let totalVehiculos = 0;
    let totalInfracciones = 0;
    let sumaVelocidades = 0;
    
    snapshot.forEach(doc => {
      const evento = doc.data();
      totalVehiculos++;
      if (evento.esInfraccion) totalInfracciones++;
      sumaVelocidades += evento.velocidad || 0;
    });
    
    res.json({
      totalVehiculos,
      velocidadPromedio: totalVehiculos > 0 ? Math.round(sumaVelocidades / totalVehiculos) : 0,
      totalInfracciones,
      porcentajeInfracciones: totalVehiculos > 0 ? Math.round((totalInfracciones / totalVehiculos) * 100) : 0,
      ultimaActualizacion: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /api/estadisticas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de datos para gráficos
app.get('/api/graficos', async (req, res) => {
  try {
    // Obtener eventos de las últimas 24 horas
    const hace24h = new Date();
    hace24h.setHours(hace24h.getHours() - 24);
    
    const snapshot = await db.collection('eventos_trafico')
      .where('recibidoEn', '>=', admin.firestore.Timestamp.fromDate(hace24h))
      .orderBy('recibidoEn', 'asc')
      .get();
    
    // Agrupar por hora
    const datosPorHora = {};
    
    snapshot.forEach(doc => {
      const evento = doc.data();
      const fecha = evento.recibidoEn ? evento.recibidoEn.toDate() : new Date();
      const hora = `${fecha.getHours().toString().padStart(2, '0')}:00`;
      
      if (!datosPorHora[hora]) {
        datosPorHora[hora] = {
          vehiculos: 0,
          infracciones: 0,
          velocidades: []
        };
      }
      
      datosPorHora[hora].vehiculos++;
      if (evento.esInfraccion) datosPorHora[hora].infracciones++;
      datosPorHora[hora].velocidades.push(evento.velocidad || 0);
    });
    
    // Convertir a array y calcular promedios
    const graficos = Object.entries(datosPorHora).map(([hora, datos]) => ({
      hora,
      vehiculos: datos.vehiculos,
      infracciones: datos.infracciones,
      velocidadPromedio: Math.round(
        datos.velocidades.reduce((sum, v) => sum + v, 0) / datos.velocidades.length
      )
    }));
    
    // Ordenar por hora y tomar las últimas 12
    graficos.sort((a, b) => a.hora.localeCompare(b.hora));
    
    res.json(graficos.slice(-12));
  } catch (error) {
    console.error('Error en /api/graficos:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 SIAV Backend Server running on port ${PORT}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`📊 Statistics:   http://localhost:${PORT}/stats`);
  console.log(`📋 Recent events: http://localhost:${PORT}/eventos/recientes`);
  console.log(`📈 Generate report: http://localhost:${PORT}/generar-reporte`);
  console.log(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down gracefully...');
  mqttClient.end();
  process.exit(0);
});