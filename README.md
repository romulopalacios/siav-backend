# 🚀 SIAV Backend - Supabase Edition# SIAV Backend - MQTT Bridge to Supabase PostgreSQL



Sistema de backend para **SIAV** (Sistema Inteligente de Analítica Vial) que funciona como puente MQTT → Supabase PostgreSQL.Backend Node.js que actúa como puente entre el broker MQTT y Supabase (PostgreSQL).



## 📋 Características## 🎯 Funcionalidades



- ✅ **MQTT Bridge**: Recibe eventos de dispositivos IoT vía MQTT- ✅ **MQTT Bridge**: Suscribe al broker MQTT y guarda eventos en PostgreSQL

- ✅ **Supabase PostgreSQL**: Almacenamiento persistente escalable- ✅ **Detección de Infracciones**: Registra infracciones automáticamente

- ✅ **API REST**: Endpoints para consultar estadísticas y eventos- ✅ **API REST**: Endpoints para consultas y reportes

- ✅ **Validación de datos**: Integridad completa de velocidad, dirección y ubicación- ✅ **Reportes Diarios**: Generación de analítica agregada

- ✅ **Caché inteligente**: Reduce carga en DB con TTL configurable- ✅ **Health Check**: Monitoreo del estado del servidor

- ✅ **Detección de infracciones**: Registro automático de excesos de velocidad- ✅ **Caché Inteligente**: Reduce lecturas de base de datos

- ✅ **Alta Disponibilidad**: Sin límites de cuota

## 🛠️ Stack Tecnológico

## 📋 Requisitos

- **Node.js 18+**

- **Express 5.1.0**- Node.js 18+ 

- **Supabase Client 2.39.0**- Cuenta Supabase (plan gratuito)

- **MQTT 5.14.1**- Broker MQTT (test.mosquitto.org por defecto)

- **PostgreSQL** (via Supabase)

## 🚀 Instalación

## 📦 Instalación Local

```bash

```bash# Instalar dependencias

# Instalar dependenciasnpm install

npm install

# O si usas el workspace root

# Configurar variables de entornocd backend

cp .env.example .envnpm install

# Editar .env con tus credenciales```



# Iniciar servidor## ⚙️ Configuración

npm start

```### 1. Crear proyecto Supabase



## 🔧 Variables de Entorno Requeridas1. Ve a https://supabase.com

2. Crea una cuenta (usa GitHub)

```env3. Crea un nuevo proyecto: `siav-deteccion-velocidad`

# Supabase Configuration4. Elige región: `South America (São Paulo)`

SUPABASE_URL=https://tu-proyecto.supabase.co5. Espera ~2 minutos

SUPABASE_SERVICE_KEY=tu-service-role-key-aqui

### 2. Ejecutar Schema SQL

# MQTT Configuration

MQTT_BROKER=mqtt://test.mosquitto.org:18831. En Supabase, ve a **SQL Editor**

MQTT_TOPIC=siav/eventos/test2. Crea un **New query**

3. Copia y pega el contenido de `supabase-schema.sql`

# Server Configuration4. Haz clic en **Run** (▶️)

PORT=30005. Verifica: ✅ "Schema creado exitosamente"

NODE_ENV=production

```### 3. Obtener Credenciales



## 🚂 Deploy en Railway1. Ve a **Settings** → **API**

2. Copia:

### Opción 1: Desde GitHub (Recomendado)   - **Project URL** → `SUPABASE_URL`

   - **anon/public key** → `SUPABASE_ANON_KEY`

1. **Sube el código a GitHub:**   - **service_role key** → `SUPABASE_SERVICE_KEY`

```bash

git add .### 4. Configurar variables de entorno

git commit -m "Preparado para Railway deployment"

git push origin mainCrea/edita el archivo `.env`:

```

```env

2. **Conecta con Railway:**# Supabase

   - Ve a [railway.app](https://railway.app)SUPABASE_URL=https://tuproyecto.supabase.co

   - Click en **"New Project"** → **"Deploy from GitHub repo"**SUPABASE_ANON_KEY=tu-anon-key-aqui

   - Selecciona tu repositorio `siav-backend`SUPABASE_SERVICE_KEY=tu-service-role-key-aqui



3. **Configura Variables de Entorno:**# MQTT

   - En Railway Dashboard → tu proyecto → **Variables**MQTT_BROKER=mqtt://test.mosquitto.org:1883

   - Agrega todas las variables del archivo `.env`:MQTT_TOPIC=siav/eventos/test

     ```

     SUPABASE_URL=https://iagocycfidhjylitjbhj.supabase.co# Server

     SUPABASE_SERVICE_KEY=tu-service-keyPORT=3000

     MQTT_BROKER=mqtt://test.mosquitto.org:1883NODE_ENV=development

     MQTT_TOPIC=siav/eventos/test```

     PORT=3000

     NODE_ENV=production## 🏃 Ejecución

     ```

### Modo Desarrollo (con auto-reload)

4. **Deploy automático:**```bash

   - Railway detectará `railway.json` y `Procfile`npm run dev

   - El deploy se iniciará automáticamente```

   - Obtendrás una URL pública: `https://tu-proyecto.up.railway.app`

### Modo Producción

### Opción 2: Railway CLI```bash

npm start

```bash```

# Instalar Railway CLI

npm i -g @railway/cli## 📡 API Endpoints



# Login| Método | Endpoint | Descripción |

railway login|--------|----------|-------------|

| GET | `/` | Health check y estado del servidor |

# Inicializar proyecto| GET | `/stats` | Estadísticas globales (con caché de 30s) |

railway init| GET | `/eventos/recientes?limit=10` | Últimos N eventos |

| GET | `/generar-reporte?fecha=2025-01-15` | Generar reporte para fecha específica |

# Deploy| GET | `/reportes?limit=30` | Obtener últimos reportes históricos |

railway up| GET | `/api/eventos?limit=100` | Eventos (formato dashboard) |

```| GET | `/api/estadisticas` | Estadísticas (formato dashboard) |

| GET | `/api/graficos` | Datos para gráficos (últimas 12h) |

## 🔍 Verificar Deploy

### Ejemplos de uso

Después del deploy, verifica estos endpoints:

```bash

- **Health Check**: `https://tu-proyecto.up.railway.app/`# Health check

- **Estadísticas**: `https://tu-proyecto.up.railway.app/stats`curl http://localhost:3000/

- **Eventos recientes**: `https://tu-proyecto.up.railway.app/eventos/recientes`

- **API Dashboard**: `https://tu-proyecto.up.railway.app/api/estadisticas`# Estadísticas (con caché)

curl http://localhost:3000/stats

## 📡 Endpoints API

# Últimos 5 eventos

### Información Generalcurl http://localhost:3000/eventos/recientes?limit=5

- `GET /` - Health check y estado del servidor

- `GET /stats` - Estadísticas generales del sistema# Generar reporte de hoy

curl http://localhost:3000/generar-reporte

### Eventos

- `GET /eventos/recientes` - Últimos 50 eventos registrados# Dashboard - estadísticas

- `GET /api/eventos` - Lista paginada de eventoscurl http://localhost:3000/api/estadisticas



### Estadísticas# Dashboard - gráficos

- `GET /api/estadisticas` - Estadísticas para dashboardcurl http://localhost:3000/api/graficos

- `GET /api/graficos` - Datos para gráficos```



### Reportes## 🗄️ Estructura de Base de Datos (PostgreSQL)

- `POST /generar-reporte` - Genera reporte diario

- `GET /reportes` - Lista de reportes generados### Tabla: `eventos_trafico`

```sql

## 🧪 Testingid                  BIGSERIAL PRIMARY KEY

dispositivo_id      VARCHAR(100) NOT NULL

### Test local con curl:velocidad           NUMERIC(6,2) NOT NULL

```bashdireccion           VARCHAR(10) NOT NULL

curl http://localhost:3000/es_infraccion       BOOLEAN DEFAULT false

curl http://localhost:3000/statstimestamp           TIMESTAMPTZ NOT NULL

```ubicacion           JSONB

limite_velocidad    INTEGER DEFAULT 50

### Test en Railway:procesado           BOOLEAN DEFAULT false

```bashrecibido_en         TIMESTAMPTZ DEFAULT NOW()

curl https://tu-proyecto.up.railway.app/stats```

```

### Tabla: `infracciones`

## 📊 Estructura de Base de Datos```sql

id                  BIGSERIAL PRIMARY KEY

### Tabla: `eventos_trafico`evento_id           BIGINT REFERENCES eventos_trafico(id)

- Almacena todas las detecciones de vehículosvelocidad           NUMERIC(6,2) NOT NULL

- Campos: `id`, `dispositivo_id`, `velocidad`, `direccion`, `es_infraccion`, `timestamp`, `ubicacion`, etc.direccion           VARCHAR(10) NOT NULL

ubicacion           JSONB

### Tabla: `infracciones`dispositivo_id      VARCHAR(100) NOT NULL

- Registro específico de infracciones de velocidadtimestamp           TIMESTAMPTZ NOT NULL

- Referencia a `eventos_trafico` con foreign keylimite_velocidad    INTEGER DEFAULT 50

notificada          BOOLEAN DEFAULT false

### Tabla: `reportes_diarios`creado_en           TIMESTAMPTZ DEFAULT NOW()

- Resúmenes agregados por fecha```

- Incluye promedios, máximos, mínimos y porcentajes

### Tabla: `reportes_diarios`

## 🔐 Seguridad```sql

id                          BIGSERIAL PRIMARY KEY

- ✅ Variables de entorno nunca en códigofecha                       DATE NOT NULL UNIQUE

- ✅ `.env` en `.gitignore`total_detecciones           INTEGER DEFAULT 0

- ✅ Service role key solo en variables de Railwaytotal_infracciones          INTEGER DEFAULT 0

- ✅ CORS configurado para producciónporcentaje_infracciones     NUMERIC(5,2)

- ✅ RLS (Row Level Security) habilitado en Supabasevelocidad_promedio          NUMERIC(6,2)

velocidad_maxima            NUMERIC(6,2)

## 🐛 Troubleshootingvelocidad_minima            NUMERIC(6,2)

direcciones                 JSONB

### El servidor no inicia en Railway:generado_en                 TIMESTAMPTZ DEFAULT NOW()

1. Verifica que `PORT` esté en variables de entorno (Railway lo asigna automáticamente)```

2. Revisa los logs: Railway Dashboard → Deployments → View Logs

3. Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` estén correctos## 🚀 Ventajas vs Firebase



### No recibe eventos MQTT:| Característica | Firebase | Supabase |

1. Verifica la URL del broker MQTT|----------------|----------|----------|

2. Confirma que el topic sea el mismo en publisher y backend| **Lecturas/día** | 50,000 (limitado) | Ilimitadas* |

3. Revisa los logs para ver si hay conexión al broker| **Escrituras/día** | 20,000 (limitado) | Ilimitadas* |

| **Base de datos** | NoSQL | PostgreSQL |

### Errores de base de datos:| **Queries** | Limitadas | SQL completo |

1. Verifica que las tablas estén creadas en Supabase SQL Editor| **Agregaciones** | No nativas | Nativas (SUM, AVG, etc) |

2. Confirma que el `SUPABASE_SERVICE_KEY` tenga permisos de escritura| **Escalabilidad** | Costosa | Económica |

3. Revisa las políticas RLS en Supabase Dashboard| **Open Source** | No | Sí |



## 📝 Logs en Railway_*Limitado por recursos del servidor, no por operaciones_



Accede desde:## 🧪 Probar el Sistema

- Railway Dashboard → tu proyecto → Deployments → View Logs

- O usa Railway CLI: `railway logs`### Terminal 1: Iniciar Backend

```bash

## 🎯 Monitoreonpm start

```

Railway proporciona:

- 📊 Métricas de CPU y MemoriaDeberías ver:

- 🔄 Auto-restart en caso de fallos```

- 📈 Gráficos de uso de recursos🚀 SIAV Backend Server v2.0.0 (Supabase Edition)

- 🚨 Healthcheck automático✅ Supabase: Connected

✅ MQTT Broker: Connected

## 📄 Licencia✅ Database: Supabase PostgreSQL

```

ISC

### Terminal 2: Publicar eventos de prueba

## 👥 Autor```bash

cd ../hardware/simulator

SIAV Team - Sistema Inteligente de Analítica Vialpython publisher.py --count 10

```

---

Verás los eventos llegando al backend y guardándose en Supabase.

**¿Problemas con el deployment?** Revisa los logs en Railway Dashboard o verifica las variables de entorno.

## 🐛 Troubleshooting

### Error: "SUPABASE_URL is required"
**Solución:** Configura las variables en `.env` (ver paso 3-4 de Configuración)

### Error: "Table does not exist"
**Solución:** Ejecuta el script `supabase-schema.sql` en el SQL Editor de Supabase

### Error: "Permission denied"
**Solución:** Verifica que uses `SUPABASE_SERVICE_KEY` en lugar de `SUPABASE_ANON_KEY`

### Error: "MQTT Connection error"
**Solución:** Verifica que el broker MQTT esté accesible. Prueba con `test.mosquitto.org`

## 📦 Despliegue en Railway.app

1. Sube tu código a GitHub
2. Conecta Railway.app con tu repo
3. Agrega las variables de entorno en Railway:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `MQTT_BROKER`
   - `MQTT_TOPIC`
4. Railway detectará automáticamente Node.js y desplegará

## 📝 Notas Importantes

- ✅ **Caché de 30s** en estadísticas (reduce lecturas)
- ✅ **Fallback a memoria** si Supabase falla
- ✅ **Row Level Security (RLS)** habilitado
- ✅ **Índices optimizados** para consultas rápidas
- ✅ **Vista materializada** para estadísticas en tiempo real
- ✅ QoS 1 en MQTT para garantizar entrega

## 🔄 Migración desde Firebase

Si tienes datos en Firebase, consulta `MIGRACION-SUPABASE.md` para:
1. Exportar datos de Firebase
2. Importar a Supabase
3. Verificar integridad

---

**Proyecto:** SIAV - Sistema Inteligente de Analítica Vial  
**Versión:** 2.0.0 (Supabase Edition)  
**Base de Datos:** PostgreSQL (Supabase)  
**Arquitectura:** MQTT Bridge + REST API
