const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
require('dotenv').config();

// ============================================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================================

let supabase;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized successfully');
  console.log(`✅ Connected to: ${supabaseUrl}`);
} catch (error) {
  console.error('❌ Error initializing Supabase:', error.message);
  console.log('⚠️  Check your Supabase configuration');
  console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// ============================================================================
// CONFIGURACIÓN DE EXPRESS
// ============================================================================

const app = express();
const cors = require('cors');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS para desarrollo
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SIAV Backend API Documentation'
}));

// ============================================================================
// CACHÉ EN MEMORIA PARA REDUCIR LECTURAS
// ============================================================================

const cache = {
  estadisticas: {
    data: null,
    timestamp: null,
    ttl: 30000 // 30 segundos
  },
  eventos: {
    data: [],
    timestamp: null,
    ttl: 10000 // 10 segundos
  },
  contadores: {
    totalDetecciones: 0,
    totalInfracciones: 0,
    ultimaActualizacion: new Date().toISOString()
  }
};

function isCacheValid(cacheKey) {
  const cacheEntry = cache[cacheKey];
  if (!cacheEntry.data || !cacheEntry.timestamp) return false;
  return (Date.now() - cacheEntry.timestamp) < cacheEntry.ttl;
}

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
    
    // ✅ VALIDACIÓN DE INTEGRIDAD DE DATOS (MANTIENE LÓGICA ORIGINAL)
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
    
    // Validar timestamp
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
    
    // Validar ubicación
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
    
    // Escribir en Supabase (eventos_trafico)
    const { data: eventoGuardado, error: errorEvento } = await supabase
      .from('eventos_trafico')
      .insert({
        dispositivo_id: evento.dispositivo_id,
        velocidad: parseFloat(evento.velocidad),
        direccion: evento.direccion,
        es_infraccion: Boolean(evento.esInfraccion),
        timestamp: timestampValido,
        ubicacion: evento.ubicacion || null,
        limite_velocidad: typeof evento.limiteVelocidad === 'number' ? evento.limiteVelocidad : 50,
        procesado: false
      })
      .select()
      .single();
    
    if (errorEvento) {
      console.error('❌ Error guardando evento:', errorEvento.message);
      return;
    }
    
    console.log(`✅ Event saved to Supabase: ${eventoGuardado.id}`);
    
    // Actualizar contadores en caché
    cache.contadores.totalDetecciones++;
    if (evento.esInfraccion === true) {
      cache.contadores.totalInfracciones++;
    }
    cache.contadores.ultimaActualizacion = new Date().toISOString();
    
    // Si es infracción, crear registro especial
    if (evento.esInfraccion === true) {
      const { error: errorInfraccion } = await supabase
        .from('infracciones')
        .insert({
          evento_id: eventoGuardado.id,
          velocidad: parseFloat(evento.velocidad),
          direccion: evento.direccion,
          ubicacion: evento.ubicacion || null,
          dispositivo_id: evento.dispositivo_id,
          timestamp: timestampValido,
          limite_velocidad: typeof evento.limiteVelocidad === 'number' ? evento.limiteVelocidad : 50,
          notificada: false
        });
      
      if (errorInfraccion) {
        console.error('❌ Error guardando infracción:', errorInfraccion.message);
      } else {
        console.log('🚨 Infraction record created');
      }
    }
    
    // Invalidar caché
    cache.estadisticas.data = null;
    
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Actualizar contadores en memoria como fallback
    cache.contadores.totalDetecciones++;
    if (evento && evento.esInfraccion === true) {
      cache.contadores.totalInfracciones++;
    }
    cache.contadores.ultimaActualizacion = new Date().toISOString();
  }
});

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// Health check mejorado
app.get('/', async (req, res) => {
  const health = {
    status: 'SIAV Backend Running',
    version: '2.0.0',
    database: 'Supabase PostgreSQL',
    timestamp: new Date().toISOString(),
    mqtt: {
      connected: mqttClient.connected,
      broker: MQTT_BROKER,
      topic: MQTT_TOPIC
    },
    supabase: {
      connected: !!supabase,
      url: process.env.SUPABASE_URL
    },
    cache: {
      estadisticas: isCacheValid('estadisticas'),
      eventos: isCacheValid('eventos')
    },
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };
  
  // Test de conectividad a Supabase
  try {
    const { count, error } = await supabase
      .from('eventos_trafico')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    health.supabase.readable = true;
    health.supabase.totalEvents = count;
  } catch (error) {
    health.supabase.readable = false;
    health.supabase.error = error.message;
  }
  
  res.json(health);
});

// Obtener estadísticas en tiempo real (CON CACHÉ)
app.get('/stats', async (req, res) => {
  try {
    // Si el caché es válido, usarlo
    if (isCacheValid('estadisticas')) {
      console.log('📦 Serving stats from cache');
      return res.json({
        ...cache.estadisticas.data,
        cached: true,
        cacheAge: Math.round((Date.now() - cache.estadisticas.timestamp) / 1000) + 's'
      });
    }
    
    // Leer de Supabase usando la vista optimizada
    const { data, error } = await supabase
      .from('vista_estadisticas_tiempo_real')
      .select('*')
      .single();
    
    if (error) throw error;
    
    const stats = {
      totalDetecciones: parseInt(data.total_detecciones) || 0,
      totalInfracciones: parseInt(data.total_infracciones) || 0,
      porcentajeInfracciones: parseFloat(data.porcentaje_infracciones) || 0,
      velocidadPromedio: parseFloat(data.velocidad_promedio) || 0,
      timestamp: data.ultima_actualizacion || new Date().toISOString(),
      cached: false
    };
    
    // Actualizar caché
    cache.estadisticas.data = stats;
    cache.estadisticas.timestamp = Date.now();
    cache.contadores.totalDetecciones = stats.totalDetecciones;
    cache.contadores.totalInfracciones = stats.totalInfracciones;
    
    res.json(stats);
  } catch (error) {
    console.error('Error en /stats:', error);
    
    // Fallback: usar contadores en memoria
    const stats = {
      totalDetecciones: cache.contadores.totalDetecciones,
      totalInfracciones: cache.contadores.totalInfracciones,
      porcentajeInfracciones: cache.contadores.totalDetecciones > 0 ? 
        Math.round((cache.contadores.totalInfracciones / cache.contadores.totalDetecciones) * 100) : 0,
      timestamp: cache.contadores.ultimaActualizacion,
      cached: true,
      fallback: true
    };
    
    res.json(stats);
  }
});

// Obtener últimos eventos
app.get('/eventos/recientes', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 10;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    
    const { data: eventos, error } = await supabase
      .from('eventos_trafico')
      .select('*')
      .order('recibido_en', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
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
    
    console.log(`\n📊 Generating report for ${fecha}...`);
    
    // Obtener eventos del día
    const { data: eventos, error } = await supabase
      .from('eventos_trafico')
      .select('*')
      .gte('timestamp', `${fecha}T00:00:00Z`)
      .lte('timestamp', `${fecha}T23:59:59Z`);
    
    if (error) throw error;
    
    if (!eventos || eventos.length === 0) {
      return res.json({
        success: true,
        message: 'No events found for this date',
        fecha,
        totalDetecciones: 0,
        totalInfracciones: 0,
        porcentajeInfracciones: 0
      });
    }
    
    // Calcular estadísticas
    let totalDetecciones = 0;
    let totalInfracciones = 0;
    let velocidades = [];
    let direcciones = { norte: 0, sur: 0 };
    
    eventos.forEach(evento => {
      if (typeof evento.velocidad !== 'number' || evento.velocidad < 0 || evento.velocidad > 300) {
        return;
      }
      
      totalDetecciones++;
      if (evento.es_infraccion === true) totalInfracciones++;
      velocidades.push(evento.velocidad);
      
      if (evento.direccion === 'norte') direcciones.norte++;
      else if (evento.direccion === 'sur') direcciones.sur++;
    });
    
    if (velocidades.length === 0) {
      return res.json({
        success: true,
        message: 'No valid data found for this date',
        fecha,
        totalDetecciones: 0
      });
    }
    
    const velocidadPromedio = velocidades.reduce((a, b) => a + b, 0) / velocidades.length;
    const velocidadMaxima = Math.max(...velocidades);
    const velocidadMinima = Math.min(...velocidades);
    
    const reporte = {
      fecha,
      total_detecciones: totalDetecciones,
      total_infracciones: totalInfracciones,
      porcentaje_infracciones: parseFloat(((totalInfracciones / totalDetecciones) * 100).toFixed(2)),
      velocidad_promedio: Math.round(velocidadPromedio * 100) / 100,
      velocidad_maxima: velocidadMaxima,
      velocidad_minima: velocidadMinima,
      direcciones: direcciones
    };
    
    // Guardar reporte (upsert)
    const { error: errorReporte } = await supabase
      .from('reportes_diarios')
      .upsert(reporte, { onConflict: 'fecha' });
    
    if (errorReporte) throw errorReporte;
    
    console.log(`✅ Report generated: ${totalDetecciones} detections, ${totalInfracciones} infractions`);
    
    res.json({
      success: true,
      fecha,
      ...reporte
    });
  } catch (error) {
    console.error('❌ Error generating report:', error);
    res.status(500).json({ 
      error: 'Error al generar reporte',
      message: error.message 
    });
  }
});

// Obtener reportes históricos
app.get('/reportes', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 30;
    if (limit < 1) limit = 30;
    if (limit > 90) limit = 90;
    
    const { data: reportes, error } = await supabase
      .from('reportes_diarios')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
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

// Endpoint compatible con el dashboard: /api/eventos
app.get('/api/eventos', async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 100;
    if (limit < 1) limit = 100;
    if (limit > 500) limit = 500;
    
    const { data: eventos, error } = await supabase
      .from('eventos_trafico')
      .select('*')
      .order('recibido_en', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    // Transformar al formato esperado por el frontend
    const eventosFormateados = eventos.map(data => ({
      id: data.id,
      timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
      velocidad: data.velocidad,
      direccion: data.direccion || 'N/A',
      ubicacion: data.ubicacion || {
        lat: -0.9549,
        lng: -80.7288,
        nombre: 'Ubicación desconocida'
      },
      esInfraccion: Boolean(data.es_infraccion),
      limiteVelocidad: data.limite_velocidad || 50,
      fecha: data.timestamp || new Date().toISOString(),
      dispositivo_id: data.dispositivo_id
    }));
    
    res.json(eventosFormateados);
  } catch (error) {
    console.error('Error en /api/eventos:', error);
    res.status(500).json({ 
      error: 'Error al obtener eventos',
      message: error.message 
    });
  }
});

// Endpoint de estadísticas compatible con el dashboard (CON CACHÉ Y FALLBACK)
app.get('/api/estadisticas', async (req, res) => {
  try {
    // Si el caché es válido, usarlo
    if (isCacheValid('estadisticas')) {
      console.log('📦 Serving dashboard stats from cache');
      return res.json(cache.estadisticas.data);
    }
    
    // Leer últimos 50 eventos para calcular
    const { data: eventos, error } = await supabase
      .from('eventos_trafico')
      .select('velocidad, es_infraccion')
      .order('recibido_en', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    let totalDetecciones = 0;
    let totalInfracciones = 0;
    let sumaVelocidades = 0;
    
    eventos.forEach(evento => {
      if (typeof evento.velocidad !== 'number' || evento.velocidad < 0) {
        return;
      }
      
      totalDetecciones++;
      if (evento.es_infraccion === true) totalInfracciones++;
      sumaVelocidades += evento.velocidad;
    });
    
    const stats = {
      totalDetecciones,
      velocidadPromedio: totalDetecciones > 0 ? Math.round(sumaVelocidades / totalDetecciones) : 0,
      totalInfracciones,
      porcentajeInfracciones: totalDetecciones > 0 ? Math.round((totalInfracciones / totalDetecciones) * 100) : 0,
      ultimaActualizacion: new Date().toISOString()
    };
    
    // Actualizar caché
    cache.estadisticas.data = stats;
    cache.estadisticas.timestamp = Date.now();
    
    res.json(stats);
  } catch (error) {
    console.error('Error en /api/estadisticas:', error);
    
    // Fallback: usar contadores en memoria
    const stats = {
      totalDetecciones: cache.contadores.totalDetecciones,
      velocidadPromedio: 65,
      totalInfracciones: cache.contadores.totalInfracciones,
      porcentajeInfracciones: cache.contadores.totalDetecciones > 0 ? 
        Math.round((cache.contadores.totalInfracciones / cache.contadores.totalDetecciones) * 100) : 0,
      ultimaActualizacion: cache.contadores.ultimaActualizacion,
      fallback: true
    };
    
    res.json(stats);
  }
});

// Endpoint de datos para gráficos
app.get('/api/graficos', async (req, res) => {
  try {
    // Obtener eventos de las últimas 24 horas
    const hace24h = new Date();
    hace24h.setHours(hace24h.getHours() - 24);
    
    const { data: eventos, error } = await supabase
      .from('eventos_trafico')
      .select('velocidad, es_infraccion, recibido_en')
      .gte('recibido_en', hace24h.toISOString())
      .order('recibido_en', { ascending: true });
    
    if (error) throw error;
    
    // Agrupar por hora
    const datosPorHora = {};
    
    eventos.forEach(evento => {
      if (typeof evento.velocidad !== 'number' || evento.velocidad < 0) {
        return;
      }
      
      const fecha = new Date(evento.recibido_en);
      const hora = `${fecha.getHours().toString().padStart(2, '0')}:00`;
      
      if (!datosPorHora[hora]) {
        datosPorHora[hora] = {
          detecciones: 0,
          infracciones: 0,
          velocidades: []
        };
      }
      
      datosPorHora[hora].detecciones++;
      if (evento.es_infraccion === true) datosPorHora[hora].infracciones++;
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
    res.status(500).json({ 
      error: 'Error al obtener gráficos',
      message: error.message 
    });
  }
});

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
// ============================================================================

// Endpoint para servir el swagger.json
app.get('/swagger.json', (req, res) => {
  res.json(swaggerDocument);
});

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
      'GET /api/graficos',
      'GET /api-docs',
      'GET /swagger.json'
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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 SIAV Backend Server v2.0.0 (Supabase Edition)`);
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
  console.log(`\n📚 API Documentation:`);
  console.log(`   Swagger UI:      http://localhost:${PORT}/api-docs`);
  console.log(`   OpenAPI JSON:    http://localhost:${PORT}/swagger.json`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ MQTT Broker: ${MQTT_BROKER}`);
  console.log(`✅ Database: Supabase PostgreSQL`);
  console.log(`📦 Cache: Enabled (30s TTL for stats, 10s for events)`);
  console.log(`⚡ Mode: High-performance with in-memory fallback\n`);
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
