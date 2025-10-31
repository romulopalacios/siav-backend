# 📚 SIAV Backend - Documentación de API

## Información General

**Versión:** 2.0.0  
**Base URL (Local):** `http://localhost:3000`  
**Base URL (Producción):** `https://siav-backend.railway.app`  
**Protocolo:** HTTP/HTTPS  
**Formato de respuesta:** JSON

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Endpoints](#endpoints)
   - [Health Check](#1-health-check)
   - [Estadísticas](#2-estadísticas)
   - [Eventos Recientes](#3-eventos-recientes)
   - [Generar Reporte](#4-generar-reporte)
   - [Reportes Históricos](#5-reportes-históricos)
   - [API Dashboard - Eventos](#6-api-dashboard---eventos)
   - [API Dashboard - Estadísticas](#7-api-dashboard---estadísticas)
   - [API Dashboard - Gráficos](#8-api-dashboard---gráficos)
3. [Modelos de Datos](#modelos-de-datos)
4. [Códigos de Estado](#códigos-de-estado)
5. [Sistema de Caché](#sistema-de-caché)
6. [Integración MQTT](#integración-mqtt)

---

## Autenticación

Actualmente, la API no requiere autenticación. CORS está habilitado para todas las origines (`*`) en modo desarrollo.

**Configuración CORS:**
- Origins: `*`
- Methods: `GET`, `POST`, `PUT`, `DELETE`
- Headers: `Content-Type`, `Authorization`

---

## Endpoints

### 1. Health Check

Verifica el estado de salud del servidor y sus componentes.

**Endpoint:** `GET /`

**Descripción:** Retorna información detallada sobre el estado del servidor, conectividad MQTT, Supabase, estado del caché y métricas de memoria.

**Parámetros:** Ninguno

**Respuesta Exitosa (200):**

```json
{
  "status": "SIAV Backend Running",
  "version": "2.0.0",
  "database": "Supabase PostgreSQL",
  "timestamp": "2025-10-31T12:00:00.000Z",
  "mqtt": {
    "connected": true,
    "broker": "mqtt://test.mosquitto.org:1883",
    "topic": "siav/eventos/test"
  },
  "supabase": {
    "connected": true,
    "url": "https://xxxxx.supabase.co",
    "readable": true,
    "totalEvents": 1250
  },
  "cache": {
    "estadisticas": true,
    "eventos": false
  },
  "uptime": 3600,
  "memory": {
    "used": 45,
    "total": 128,
    "unit": "MB"
  }
}
```

**Campos de Respuesta:**
- `status`: Estado general del servidor
- `version`: Versión del backend
- `database`: Sistema de base de datos utilizado
- `timestamp`: Marca de tiempo de la respuesta
- `mqtt.connected`: Estado de conexión MQTT (boolean)
- `supabase.readable`: Capacidad de lectura de la base de datos (boolean)
- `uptime`: Tiempo de actividad en segundos
- `memory`: Uso de memoria en MB

---

### 2. Estadísticas

Obtiene estadísticas globales del sistema en tiempo real.

**Endpoint:** `GET /stats`

**Descripción:** Retorna métricas globales del sistema con soporte de caché (30s TTL). Incluye detecciones totales, infracciones, porcentaje y velocidad promedio.

**Parámetros:** Ninguno

**Respuesta Exitosa (200):**

```json
{
  "totalDetecciones": 1250,
  "totalInfracciones": 89,
  "porcentajeInfracciones": 7.12,
  "velocidadPromedio": 54.3,
  "timestamp": "2025-10-31T12:00:00.000Z",
  "cached": true,
  "cacheAge": "15s"
}
```

**Campos de Respuesta:**
- `totalDetecciones` (integer): Número total de vehículos detectados
- `totalInfracciones` (integer): Número total de infracciones registradas
- `porcentajeInfracciones` (float): Porcentaje de infracciones (0-100)
- `velocidadPromedio` (float): Velocidad promedio en km/h
- `cached` (boolean): Indica si los datos vienen del caché
- `cacheAge` (string): Edad del caché (solo si cached=true)
- `fallback` (boolean): Indica si se usó fallback de memoria (en caso de error)

**Nota:** En caso de error de base de datos, este endpoint retorna datos del caché en memoria con `fallback: true`.

---

### 3. Eventos Recientes

Obtiene los eventos de tráfico más recientes.

**Endpoint:** `GET /eventos/recientes`

**Descripción:** Retorna una lista de eventos de tráfico ordenados por fecha de recepción descendente.

**Parámetros de Query:**

| Parámetro | Tipo    | Requerido | Default | Descripción                         |
|-----------|---------|-----------|---------|-------------------------------------|
| `limit`   | integer | No        | 10      | Número de eventos (min: 1, max: 100)|

**Ejemplo de Solicitud:**
```
GET /eventos/recientes?limit=20
```

**Respuesta Exitosa (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "dispositivo_id": "ESP32-001",
    "velocidad": 78.5,
    "direccion": "norte",
    "es_infraccion": true,
    "timestamp": "2025-10-31T12:00:00.000Z",
    "ubicacion": {
      "lat": -0.9549,
      "lng": -80.7288,
      "nombre": "Av. Principal"
    },
    "limite_velocidad": 50,
    "procesado": false,
    "recibido_en": "2025-10-31T12:00:01.000Z"
  }
]
```

**Respuesta de Error (500):**

```json
{
  "error": "Error al obtener eventos",
  "message": "Database connection failed"
}
```

---

### 4. Generar Reporte

Genera un reporte estadístico diario.

**Endpoint:** `GET /generar-reporte`

**Descripción:** Genera y guarda un reporte con estadísticas del día especificado. Calcula totales, promedios y distribución por dirección.

**Parámetros de Query:**

| Parámetro | Tipo   | Requerido | Default      | Descripción                    |
|-----------|--------|-----------|--------------|--------------------------------|
| `fecha`   | string | No        | Fecha actual | Fecha del reporte (YYYY-MM-DD) |

**Ejemplo de Solicitud:**
```
GET /generar-reporte?fecha=2025-10-31
```

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "fecha": "2025-10-31",
  "total_detecciones": 450,
  "total_infracciones": 32,
  "porcentaje_infracciones": 7.11,
  "velocidad_promedio": 56.8,
  "velocidad_maxima": 95.0,
  "velocidad_minima": 20.0,
  "direcciones": {
    "norte": 245,
    "sur": 205
  }
}
```

**Respuesta sin Datos (200):**

```json
{
  "success": true,
  "message": "No events found for this date",
  "fecha": "2025-10-31",
  "totalDetecciones": 0,
  "totalInfracciones": 0,
  "porcentajeInfracciones": 0
}
```

**Nota:** Los reportes se guardan con `UPSERT`, por lo que se puede regenerar un reporte existente.

---

### 5. Reportes Históricos

Obtiene reportes diarios previamente generados.

**Endpoint:** `GET /reportes`

**Descripción:** Retorna una lista de reportes diarios ordenados por fecha descendente.

**Parámetros de Query:**

| Parámetro | Tipo    | Requerido | Default | Descripción                          |
|-----------|---------|-----------|---------|--------------------------------------|
| `limit`   | integer | No        | 30      | Número de reportes (min: 1, max: 90) |

**Ejemplo de Solicitud:**
```
GET /reportes?limit=7
```

**Respuesta Exitosa (200):**

```json
[
  {
    "fecha": "2025-10-31",
    "total_detecciones": 450,
    "total_infracciones": 32,
    "porcentaje_infracciones": 7.11,
    "velocidad_promedio": 56.8,
    "velocidad_maxima": 95.0,
    "velocidad_minima": 20.0,
    "direcciones": {
      "norte": 245,
      "sur": 205
    }
  },
  {
    "fecha": "2025-10-30",
    "total_detecciones": 412,
    "total_infracciones": 28,
    "porcentaje_infracciones": 6.8,
    "velocidad_promedio": 54.2,
    "velocidad_maxima": 88.0,
    "velocidad_minima": 18.0,
    "direcciones": {
      "norte": 220,
      "sur": 192
    }
  }
]
```

---

### 6. API Dashboard - Eventos

Obtiene eventos formateados para el dashboard frontend.

**Endpoint:** `GET /api/eventos`

**Descripción:** Retorna eventos con formato específico para consumo del dashboard, incluyendo transformaciones de timestamp a milisegundos.

**Parámetros de Query:**

| Parámetro | Tipo    | Requerido | Default | Descripción                          |
|-----------|---------|-----------|---------|--------------------------------------|
| `limit`   | integer | No        | 100     | Número de eventos (min: 1, max: 500) |

**Ejemplo de Solicitud:**
```
GET /api/eventos?limit=50
```

**Respuesta Exitosa (200):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": 1730376000000,
    "velocidad": 78.5,
    "direccion": "norte",
    "ubicacion": {
      "lat": -0.9549,
      "lng": -80.7288,
      "nombre": "Av. Principal"
    },
    "esInfraccion": true,
    "limiteVelocidad": 50,
    "fecha": "2025-10-31T12:00:00.000Z",
    "dispositivo_id": "ESP32-001"
  }
]
```

**Diferencias con `/eventos/recientes`:**
- `timestamp` en milisegundos (no ISO string)
- `esInfraccion` en camelCase (no snake_case)
- `limiteVelocidad` en camelCase
- Ubicación por defecto si no existe

---

### 7. API Dashboard - Estadísticas

Obtiene estadísticas optimizadas para el dashboard.

**Endpoint:** `GET /api/estadisticas`

**Descripción:** Retorna estadísticas calculadas sobre los últimos 50 eventos con caché de 30s.

**Parámetros:** Ninguno

**Respuesta Exitosa (200):**

```json
{
  "totalDetecciones": 1250,
  "velocidadPromedio": 65,
  "totalInfracciones": 89,
  "porcentajeInfracciones": 7,
  "ultimaActualizacion": "2025-10-31T12:00:00.000Z"
}
```

**Respuesta con Fallback (500/200):**

```json
{
  "totalDetecciones": 1250,
  "velocidadPromedio": 65,
  "totalInfracciones": 89,
  "porcentajeInfracciones": 7,
  "ultimaActualizacion": "2025-10-31T12:00:00.000Z",
  "fallback": true
}
```

**Nota:** A diferencia de `/stats`, este endpoint calcula sobre una muestra de 50 eventos para mejor rendimiento.

---

### 8. API Dashboard - Gráficos

Obtiene datos agrupados por hora para visualización.

**Endpoint:** `GET /api/graficos`

**Descripción:** Retorna datos de las últimas 24 horas agrupados por hora para gráficos temporales.

**Parámetros:** Ninguno

**Respuesta Exitosa (200):**

```json
[
  {
    "hora": "10:00",
    "detecciones": 45,
    "infracciones": 3,
    "velocidadPromedio": 58
  },
  {
    "hora": "11:00",
    "detecciones": 52,
    "infracciones": 5,
    "velocidadPromedio": 62
  },
  {
    "hora": "12:00",
    "detecciones": 38,
    "infracciones": 2,
    "velocidadPromedio": 54
  }
]
```

**Características:**
- Retorna máximo 12 horas más recientes
- Velocidad promedio redondeada a entero
- Ordenado cronológicamente

---

## Modelos de Datos

### TrafficEvent

Representa un evento de detección de vehículo.

```typescript
interface TrafficEvent {
  id: string;                    // UUID del evento
  dispositivo_id: string;        // ID del dispositivo sensor
  velocidad: number;             // Velocidad en km/h
  direccion: 'norte' | 'sur';    // Dirección del vehículo
  es_infraccion: boolean;        // ¿Es infracción?
  timestamp: string;             // ISO 8601 timestamp del evento
  ubicacion: Location | null;    // Ubicación GPS (opcional)
  limite_velocidad: number;      // Límite de velocidad en km/h
  procesado: boolean;            // Estado de procesamiento
  recibido_en: string;          // Timestamp de recepción en servidor
}
```

### Location

Representa una ubicación geográfica.

```typescript
interface Location {
  lat: number;      // Latitud (-90 a 90)
  lng: number;      // Longitud (-180 a 180)
  nombre?: string;  // Nombre descriptivo (opcional)
}
```

### DailyReport

Representa un reporte diario generado.

```typescript
interface DailyReport {
  fecha: string;                   // YYYY-MM-DD
  total_detecciones: number;       // Total de vehículos detectados
  total_infracciones: number;      // Total de infracciones
  porcentaje_infracciones: number; // Porcentaje (0-100)
  velocidad_promedio: number;      // Velocidad promedio en km/h
  velocidad_maxima: number;        // Velocidad máxima registrada
  velocidad_minima: number;        // Velocidad mínima registrada
  direcciones: {
    norte: number;                 // Detecciones dirección norte
    sur: number;                   // Detecciones dirección sur
  };
}
```

### Statistics

Estadísticas globales del sistema.

```typescript
interface Statistics {
  totalDetecciones: number;        // Total acumulado
  totalInfracciones: number;       // Total acumulado
  porcentajeInfracciones: number;  // Porcentaje (0-100)
  velocidadPromedio: number;       // Velocidad promedio global
  timestamp: string;               // ISO 8601 timestamp
  cached?: boolean;                // ¿Desde caché?
  cacheAge?: string;              // Edad del caché
  fallback?: boolean;             // ¿Fallback de memoria?
}
```

---

## Códigos de Estado

| Código | Significado                | Uso                                    |
|--------|----------------------------|----------------------------------------|
| 200    | OK                         | Solicitud exitosa                      |
| 404    | Not Found                  | Endpoint no existe                     |
| 500    | Internal Server Error      | Error en servidor o base de datos      |

**Estructura de Error Estándar:**

```json
{
  "error": "Descripción breve del error",
  "message": "Mensaje detallado (solo en development)"
}
```

---

## Sistema de Caché

El backend implementa un sistema de caché en memoria con TTL para optimizar el rendimiento:

### Configuración de Caché

| Recurso       | TTL     | Descripción                              |
|---------------|---------|------------------------------------------|
| Estadísticas  | 30s     | Stats globales (`/stats`, `/api/estadisticas`) |
| Eventos       | 10s     | Lista de eventos recientes               |

### Estrategia de Invalidación

- **Caché invalidado automáticamente** al recibir nuevos eventos vía MQTT
- **Fallback a caché en memoria** si la base de datos falla
- **Contadores en memoria** actualizados en tiempo real

### Ventajas

- ✅ Reduce carga en Supabase
- ✅ Respuestas más rápidas (< 5ms desde caché)
- ✅ Resiliencia ante fallos de base de datos
- ✅ Menor latencia para dashboards en tiempo real

---

## Integración MQTT

El backend se suscribe a un broker MQTT para recibir eventos en tiempo real.

### Configuración

```
Broker: mqtt://test.mosquitto.org:1883
Topic: siav/eventos/test
QoS: 1 (At least once)
```

### Formato de Mensaje MQTT

Los dispositivos IoT deben publicar mensajes JSON en el siguiente formato:

```json
{
  "dispositivo_id": "ESP32-001",
  "velocidad": 78.5,
  "direccion": "norte",
  "esInfraccion": true,
  "timestamp": "2025-10-31T12:00:00.000Z",
  "limiteVelocidad": 50,
  "ubicacion": {
    "lat": -0.9549,
    "lng": -80.7288,
    "nombre": "Av. Principal"
  }
}
```

### Validaciones

El backend valida automáticamente:

- ✅ `dispositivo_id` es string no vacío
- ✅ `velocidad` es número entre 0-300 km/h
- ✅ `direccion` es 'norte' o 'sur'
- ✅ `esInfraccion` es booleano
- ✅ `timestamp` es fecha válida (ISO 8601)
- ✅ `ubicacion.lat` entre -90 y 90
- ✅ `ubicacion.lng` entre -180 y 180

### Procesamiento de Eventos

1. **Validación** de datos del mensaje
2. **Inserción** en tabla `eventos_trafico`
3. **Registro** en tabla `infracciones` (si es infracción)
4. **Actualización** de contadores en caché
5. **Invalidación** de caché de estadísticas
6. **Log** en consola del servidor

---

## Ejemplos de Uso

### Obtener Estado del Sistema

```bash
curl http://localhost:3000/
```

### Obtener Estadísticas

```bash
curl http://localhost:3000/stats
```

### Obtener Últimos 20 Eventos

```bash
curl "http://localhost:3000/eventos/recientes?limit=20"
```

### Generar Reporte de Ayer

```bash
curl "http://localhost:3000/generar-reporte?fecha=2025-10-30"
```

### Obtener Datos para Gráficos

```bash
curl http://localhost:3000/api/graficos
```

---

## Variables de Entorno

El backend requiere las siguientes variables de entorno:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MQTT
MQTT_BROKER=mqtt://test.mosquitto.org:1883
MQTT_TOPIC=siav/eventos/test

# Server
PORT=3000
NODE_ENV=development
```

---

## Notas Técnicas

### Rendimiento

- **Cache Hit Rate:** ~80% para endpoints de estadísticas
- **Response Time:** < 5ms desde caché, < 50ms desde BD
- **Throughput:** Soporta ~100 eventos MQTT/segundo

### Resiliencia

- ✅ **Fallback automático** a caché en memoria si BD falla
- ✅ **Reconexión automática** a MQTT cada 5s
- ✅ **Graceful shutdown** con señales SIGINT/SIGTERM

### Escalabilidad

- Horizontal: Múltiples instancias con Load Balancer
- Vertical: Optimizado para Node.js 18+
- Base de datos: Escalable vía Supabase

---

## Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.

**Versión del Documento:** 1.0.0  
**Última Actualización:** 31 de Octubre, 2025
