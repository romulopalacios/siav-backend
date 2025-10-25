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
const cors = require('cors');

// Middlewares
app.use(express.json()); // Para parsear JSON en el body
app.use(express.urlencoded({ extended: true })); // Para parsear form data

// CORS para desarrollo
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


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
    
    // ✅ VALIDACIÓN DE INTEGRIDAD DE DATOS
    if (!evento.dispositivo_id || typeof evento.dispositivo_id !== 'string') {
      console.error('❌ Evento rechazado: dispositivo_id inválido');
      return;
    }
    
    if (typeof evento.velocidad !== 'number' || evento.velocidad < 0 || evento.velocidad > 300) {
      console.error(`❌ Evento rechazado: velocidad inválida (${evento.velocidad})`);
      return;
    }
    
    if (!['norte', 'sur'].includes(evento.direccion)) {
      console.error(`❌ Evento rechazado: dirección inválida (${evento.direccion})`);
      return;
    }
    
    if (typeof evento.esInfraccion !== 'boolean') {
      console.error(`❌ Evento rechazado: esInfraccion debe ser booleano (${evento.esInfraccion})`);
      return;
    }
    
    // Validar timestamp si existe
    let timestampValido = new Date().toISOString();
    if (evento.timestamp) {
      try {
        const fechaEvento = new Date(evento.timestamp);
        if (!isNaN(fechaEvento.getTime())) {
          timestampValido = fechaEvento.toISOString();
        } else {
          console.warn(`⚠️  Timestamp inválido, usando fecha actual`);
        }
      } catch (err) {
        console.warn(`⚠️  Error parseando timestamp, usando fecha actual`);
      }
    }
    
    // Validar ubicación si existe
    if (evento.ubicacion) {
      if (typeof evento.ubicacion.lat !== 'number' || 
          typeof evento.ubicacion.lng !== 'number' ||
          evento.ubicacion.lat < -90 || evento.ubicacion.lat > 90 ||
          evento.ubicacion.lng < -180 || evento.ubicacion.lng > 180) {
        console.warn(`⚠️  Ubicación inválida, ignorando`);
        evento.ubicacion = null;
      }
    }
    
    console.log(`\n📨 Received event from ${topic}:`);
    console.log(`   Device: ${evento.dispositivo_id}`);
    console.log(`   Speed: ${evento.velocidad} km/h`);
    console.log(`   Direction: ${evento.direccion}`);
    console.log(`   Infraction: ${evento.esInfraccion ? '🚨 YES' : '✅ NO'}`);
    
    // Escribir en Firestore con datos validados
    const docRef = await db.collection('eventos_trafico').add({
      dispositivo_id: evento.dispositivo_id,
      velocidad: parseFloat(evento.velocidad),
      direccion: evento.direccion,
      esInfraccion: Boolean(evento.esInfraccion),
      timestamp: timestampValido,
      ubicacion: evento.ubicacion || null,
      limiteVelocidad: typeof evento.limiteVelocidad === 'number' ? evento.limiteVelocidad : 50,
      procesado: false,
      recibidoEn: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Event saved to Firestore: ${docRef.id}`);
    
    // Si es infracción, crear registro especial
    if (evento.esInfraccion === true) {
      await db.collection('infracciones').add({
        eventoId: docRef.id,
        velocidad: parseFloat(evento.velocidad),
        direccion: evento.direccion,
        ubicacion: evento.ubicacion || null,
        dispositivo_id: evento.dispositivo_id,
        timestamp: timestampValido,
        limiteVelocidad: typeof evento.limiteVelocidad === 'number' ? evento.limiteVelocidad : 50,
        notificada: false,
        creadoEn: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('🚨 Infraction record created');
    }
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
});

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// Health check mejorado
app.get('/', async (req, res) => {
  const health = {
    status: 'SIAV Backend Running',
    version: '1.0.1',
    timestamp: new Date().toISOString(),
    mqtt: {
      connected: mqttClient.connected,
      broker: MQTT_BROKER,
      topic: MQTT_TOPIC
    },
    firebase: {
      connected: !!db
    },
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };
  
  // Test de conectividad a Firestore (opcional, no bloquea)
  try {
    await db.collection('eventos_trafico').limit(1).get();
    health.firebase.readable = true;
  } catch (error) {
    health.firebase.readable = false;
    health.firebase.error = error.message;
  }
  
  res.json(health);
});

// Obtener estadísticas en tiempo real
app.get('/stats', async (req, res) => {
  try {
    const [eventosSnapshot, infraccionesSnapshot] = await Promise.all([
      db.collection('eventos_trafico').count().get(),
      db.collection('infracciones').count().get()
    ]);
    
    const totalDetecciones = eventosSnapshot.data().count;
    const totalInfracciones = infraccionesSnapshot.data().count;
    
    res.json({
      totalDetecciones,
      totalInfracciones,
      porcentajeInfracciones: totalDetecciones > 0 ? 
        Math.round((totalInfracciones / totalDetecciones) * 100) : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en /stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      message: error.message 
    });
  }
});

// Obtener últimos eventos
app.get('/eventos/recientes', async (req, res) => {
  try {
    // Validar y sanitizar el parámetro limit
    let limit = parseInt(req.query.limit) || 10;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100; // Máximo 100 para evitar sobrecarga
    
    const snapshot = await db.collection('eventos_trafico')
      .orderBy('recibidoEn', 'desc')
      .limit(limit)
      .get();
    
    const eventos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Asegurar que los datos críticos existen antes de enviar
      if (data.velocidad !== undefined && data.dispositivo_id) {
        eventos.push({ id: doc.id, ...data });
      }
    });
    
    res.json(eventos);
  } catch (error) {
    console.error('Error en /eventos/recientes:', error);
    res.status(500).json({ 
      error: 'Error al obtener eventos',
      message: error.message 
    });
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
        totalDetecciones: 0,
        totalInfracciones: 0,
        porcentajeInfracciones: 0
      });
    }
    
    let totalDetecciones = 0;
    let totalInfracciones = 0;
    let velocidades = [];
    let direcciones = { norte: 0, sur: 0 };
    
    snapshot.forEach(doc => {
      const evento = doc.data();
      
      // Validar datos antes de procesarlos
      if (typeof evento.velocidad !== 'number' || evento.velocidad < 0 || evento.velocidad > 300) {
        console.warn(`⚠️  Evento ${doc.id} con velocidad inválida:`, evento.velocidad);
        return; // Saltar este evento
      }
      
      totalDetecciones++;
      if (evento.esInfraccion === true) totalInfracciones++;
      velocidades.push(evento.velocidad);
      
      // Validar dirección antes de contar
      if (evento.direccion === 'norte') direcciones.norte++;
      else if (evento.direccion === 'sur') direcciones.sur++;
    });
    
    // Validar que haya velocidades válidas antes de calcular
    if (velocidades.length === 0) {
      return res.json({
        success: true,
        message: 'No valid data found for this date',
        fecha,
        totalDetecciones: 0,
        totalInfracciones: 0,
        porcentajeInfracciones: 0
      });
    }
    
    const velocidadPromedio = velocidades.reduce((a, b) => a + b, 0) / velocidades.length;
    const velocidadMaxima = Math.max(...velocidades);
    const velocidadMinima = Math.min(...velocidades);
    
    const reporte = {
      fecha: admin.firestore.Timestamp.fromDate(inicio),
      totalDetecciones,
      totalInfracciones,
      porcentajeInfracciones: parseFloat(((totalInfracciones / totalDetecciones) * 100).toFixed(2)),
      velocidadPromedio: Math.round(velocidadPromedio * 100) / 100,
      velocidadMaxima,
      velocidadMinima,
      direcciones,
      generadoEn: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('reportes_diarios').doc(fecha).set(reporte);
    
    console.log(`✅ Report generated: ${totalDetecciones} detections, ${totalInfracciones} infractions`);
    
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
    // Validar parámetro de límite opcional
    let limit = parseInt(req.query.limit) || 30;
    if (limit < 1) limit = 30;
    if (limit > 90) limit = 90; // Máximo 90 días
    
    const snapshot = await db.collection('reportes_diarios')
      .orderBy('fecha', 'desc')
      .limit(limit)
      .get();
    
    const reportes = [];
    snapshot.forEach(doc => {
      reportes.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(reportes);
  } catch (error) {
    console.error('Error en /reportes:', error);
    res.status(500).json({ 
      error: 'Error al obtener reportes',
      message: error.message 
    });
  }
});

// ============================================================================
// ENDPOINTS ADICIONALES PARA INTEGRACIÓN CON DASHBOARD
// ============================================================================
// Agregar estos endpoints después de los existentes en server.js

// Endpoint compatible con el dashboard: /api/eventos
app.get('/api/eventos', async (req, res) => {
  try {
    // Validar y sanitizar el parámetro limit
    let limit = parseInt(req.query.limit) || 100;
    if (limit < 1) limit = 100;
    if (limit > 500) limit = 500; // Máximo 500 para dashboard
    
    const snapshot = await db.collection('eventos_trafico')
      .orderBy('recibidoEn', 'desc')
      .limit(limit)
      .get();
    
    const eventos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Solo incluir eventos con datos válidos
      if (typeof data.velocidad !== 'number' || !data.dispositivo_id) {
        return;
      }
      
      // Transformar al formato esperado por el frontend
      eventos.push({
        id: doc.id,
        timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
        velocidad: data.velocidad,
        direccion: data.direccion || 'N/A',
        ubicacion: data.ubicacion || {
          lat: -0.9549,
          lng: -80.7288,
          nombre: 'Ubicación desconocida'
        },
        esInfraccion: Boolean(data.esInfraccion),
        limiteVelocidad: data.limiteVelocidad || 50,
        fecha: data.timestamp || new Date().toISOString(),
        dispositivo_id: data.dispositivo_id
      });
    });
    
    res.json(eventos);
  } catch (error) {
    console.error('Error en /api/eventos:', error);
    res.status(500).json({ 
      error: 'Error al obtener eventos',
      message: error.message 
    });
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
    
    let totalDetecciones = 0;
    let totalInfracciones = 0;
    let sumaVelocidades = 0;
    
    snapshot.forEach(doc => {
      const evento = doc.data();
      
      // Validar que los datos críticos existan
      if (typeof evento.velocidad !== 'number' || evento.velocidad < 0) {
        console.warn(`⚠️  Evento ${doc.id} con velocidad inválida:`, evento.velocidad);
        return; // Saltar este evento
      }
      
      totalDetecciones++;
      if (evento.esInfraccion === true) totalInfracciones++;
      sumaVelocidades += evento.velocidad;
    });
    
    res.json({
      totalDetecciones,
      velocidadPromedio: totalDetecciones > 0 ? Math.round(sumaVelocidades / totalDetecciones) : 0,
      totalInfracciones,
      porcentajeInfracciones: totalDetecciones > 0 ? Math.round((totalInfracciones / totalDetecciones) * 100) : 0,
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
      
      // Validar datos antes de procesarlos
      if (typeof evento.velocidad !== 'number' || evento.velocidad < 0) {
        return; // Saltar eventos con datos inválidos
      }
      
      const fecha = evento.recibidoEn ? evento.recibidoEn.toDate() : new Date();
      const hora = `${fecha.getHours().toString().padStart(2, '0')}:00`;
      
      if (!datosPorHora[hora]) {
        datosPorHora[hora] = {
          detecciones: 0,
          infracciones: 0,
          velocidades: []
        };
      }
      
      datosPorHora[hora].detecciones++;
      if (evento.esInfraccion === true) datosPorHora[hora].infracciones++;
      datosPorHora[hora].velocidades.push(evento.velocidad);
    });
    
    // Convertir a array y calcular promedios
    const graficos = Object.entries(datosPorHora).map(([hora, datos]) => ({
      hora,
      detecciones: datos.detecciones,
      infracciones: datos.infracciones,
      velocidadPromedio: datos.velocidades.length > 0 ? Math.round(
        datos.velocidades.reduce((sum, v) => sum + v, 0) / datos.velocidades.length
      ) : 0
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
// MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
// ============================================================================

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /stats',
      'GET /eventos/recientes',
      'GET /generar-reporte',
      'GET /reportes',
      'GET /api/eventos',
      'GET /api/estadisticas',
      'GET /api/graficos'
    ]
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 SIAV Backend Server v1.0.1`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Health check:    http://localhost:${PORT}/`);
  console.log(`📊 Statistics:      http://localhost:${PORT}/stats`);
  console.log(`📋 Recent events:   http://localhost:${PORT}/eventos/recientes`);
  console.log(`📈 Generate report: http://localhost:${PORT}/generar-reporte`);
  console.log(`📑 Reports:         http://localhost:${PORT}/reportes`);
  console.log(`\n🎯 API Dashboard:`);
  console.log(`   Events:          http://localhost:${PORT}/api/eventos`);
  console.log(`   Statistics:      http://localhost:${PORT}/api/estadisticas`);
  console.log(`   Charts:          http://localhost:${PORT}/api/graficos`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ MQTT Broker: ${MQTT_BROKER}`);
  console.log(`✅ Firebase: Connected\n`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n⏹️  ${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    mqttClient.end(false, () => {
      console.log('✅ MQTT client disconnected');
      
      process.exit(0);
    });
  });
  
  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));