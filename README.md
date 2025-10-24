# SIAV Backend - MQTT Bridge to Firebase

Backend Node.js que actúa como puente entre el broker MQTT y Firebase Firestore.

## 🎯 Funcionalidades

- ✅ **MQTT Bridge**: Suscribe al broker MQTT y guarda eventos en Firestore
- ✅ **Detección de Infracciones**: Registra infracciones automáticamente
- ✅ **API REST**: Endpoints para consultas y reportes
- ✅ **Reportes Diarios**: Generación de analítica agregada
- ✅ **Health Check**: Monitoreo del estado del servidor

## 📋 Requisitos

- Node.js 18+ 
- Cuenta Firebase (plan gratuito Spark)
- Broker MQTT (test.mosquitto.org por defecto)

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# O si usas el workspace root
cd backend
npm install
```

## ⚙️ Configuración

### 1. Crear proyecto Firebase

1. Ve a https://console.firebase.google.com/
2. Crea un nuevo proyecto: `siav-sistema-vial`
3. Habilita **Cloud Firestore** (modo test)

### 2. Descargar credenciales

1. Project Settings → Service Accounts
2. Click "Generate new private key"
3. Guarda el archivo JSON como `serviceAccountKey.json` en la carpeta `backend/`

### 3. Configurar variables de entorno

El archivo `.env` ya está configurado con valores por defecto. Puedes modificar:

```env
MQTT_BROKER=mqtt://test.mosquitto.org:1883
MQTT_TOPIC=siav/eventos/test
PORT=3000
```

## 🏃 Ejecución

### Modo Desarrollo (con auto-reload)
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Health check y estado del servidor |
| GET | `/stats` | Estadísticas globales (total eventos/infracciones) |
| GET | `/eventos/recientes?limit=10` | Últimos N eventos |
| GET | `/generar-reporte?fecha=2025-01-15` | Generar reporte para fecha específica |
| GET | `/reportes` | Obtener últimos 30 reportes históricos |

### Ejemplos de uso

```bash
# Health check
curl http://localhost:3000/

# Estadísticas
curl http://localhost:3000/stats

# Últimos 5 eventos
curl http://localhost:3000/eventos/recientes?limit=5

# Generar reporte de hoy
curl http://localhost:3000/generar-reporte

# Generar reporte de fecha específica
curl http://localhost:3000/generar-reporte?fecha=2025-10-24
```

## 🗄️ Estructura de Firestore

### Colección: `eventos_trafico`
```json
{
  "timestamp": "2025-10-24T10:30:45.123Z",
  "velocidad": 72.45,
  "direccion": "norte",
  "esInfraccion": true,
  "limiteVelocidad": 60,
  "dispositivo_id": "SIM_ESP32_001",
  "ubicacion": {
    "lat": 19.4326,
    "lng": -99.1332
  },
  "procesado": false,
  "recibidoEn": "Timestamp"
}
```

### Colección: `infracciones`
```json
{
  "eventoId": "abc123",
  "velocidad": 72.45,
  "direccion": "norte",
  "ubicacion": { "lat": 19.4326, "lng": -99.1332 },
  "dispositivo_id": "SIM_ESP32_001",
  "timestamp": "2025-10-24T10:30:45.123Z",
  "notificada": false,
  "creadoEn": "Timestamp"
}
```

### Colección: `reportes_diarios`
```json
{
  "fecha": "Timestamp",
  "totalEventos": 245,
  "totalInfracciones": 18,
  "porcentajeInfracciones": "7.35",
  "velocidadPromedio": 58.32,
  "velocidadMaxima": 95.5,
  "velocidadMinima": 15.2,
  "direcciones": {
    "norte": 120,
    "sur": 125
  },
  "generadoEn": "Timestamp"
}
```

## 🧪 Probar el Sistema

### Terminal 1: Iniciar Backend
```bash
npm start
```

### Terminal 2: Iniciar Subscriber (opcional, para ver logs)
```bash
cd ../hardware/simulator
python subscriber.py
```

### Terminal 3: Publicar eventos
```bash
cd ../hardware/simulator
python publisher.py --count 10
```

Verás los eventos llegando al backend y guardándose en Firestore.

## 🐛 Troubleshooting

### Error: "Cannot find module './serviceAccountKey.json'"
**Solución:** Descarga las credenciales de Firebase (ver paso 2 de Configuración)

### Error: "MQTT Connection error"
**Solución:** Verifica que el broker MQTT esté accesible. Prueba con `test.mosquitto.org`

### Error: "Permission denied" en Firestore
**Solución:** 
1. Ve a Firestore → Rules
2. Cambia temporalmente a:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Solo para desarrollo
    }
  }
}
```

## 📦 Despliegue en Railway.app

1. Sube tu código a GitHub
2. Conecta Railway.app con tu repo
3. Agrega las variables de entorno en Railway
4. Railway detectará automáticamente Node.js y desplegará

## 📝 Notas

- El servidor usa QoS 1 para garantizar entrega de mensajes MQTT
- Los reportes diarios se pueden generar manualmente o programar con cron-job.org
- Para producción, configura reglas de seguridad en Firestore

---

**Proyecto:** SIAV - Sistema Inteligente de Analítica Vial  
**Fase 2:** Backend Layer (MQTT Bridge + Firebase)
