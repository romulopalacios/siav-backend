# 🚀 Despliegue de SIAV Backend en Railway.app

Guía paso a paso para desplegar el backend en Railway (100% GRATIS).

---

## ✅ PASO 1: Verificar Pre-requisitos

### 1.1 Verificar que tienes Git instalado

```powershell
git --version
```

**Resultado esperado:** `git version 2.x.x`

**Si NO tienes Git:**
- Descarga desde: https://git-scm.com/download/win
- Instala con opciones por defecto
- Reinicia PowerShell y verifica de nuevo

### 1.2 Verificar tu configuración de Git

```powershell
git config --global user.name
git config --global user.email
```

**Si aparece vacío, configúralo:**
```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

---

## ✅ PASO 2: Crear cuenta en GitHub (si no tienes)

### 2.1 Ir a GitHub
- https://github.com/
- Click "Sign up"
- Usa tu email universitario o personal
- Completa el registro

### 2.2 Verificar que puedes iniciar sesión
- https://github.com/login

---

## ✅ PASO 3: Crear repositorio en GitHub

### 3.1 Crear nuevo repositorio

1. En GitHub, click el **+ arriba a la derecha** → "New repository"

2. **Configuración del repositorio:**
   ```
   Repository name: siav-backend
   Description: SIAV - Sistema Inteligente de Analítica Vial (Backend)
   Visibility: ✅ Public (para Railway gratis)
   
   ❌ NO marcar "Initialize with README"
   ❌ NO agregar .gitignore
   ❌ NO agregar license
   ```

3. Click **"Create repository"**

4. **COPIA la URL** que aparece (algo como):
   ```
   https://github.com/TU-USUARIO/siav-backend.git
   ```

---

## ✅ PASO 4: Inicializar Git en tu proyecto local

### 4.1 Abrir PowerShell en la carpeta backend

```powershell
cd "C:\Users\romul\OneDrive\Desktop\9no Semestre\Sistemas Distribuidos\deteccion-velocidad\backend"
```

### 4.2 Inicializar repositorio Git

```powershell
git init
```

**Resultado esperado:**
```
Initialized empty Git repository in .../backend/.git/
```

### 4.3 Agregar todos los archivos

```powershell
git add .
```

**Esto agrega:**
- ✅ server.js
- ✅ package.json
- ✅ .env
- ✅ .gitignore
- ✅ README.md
- ✅ FIREBASE_SETUP.md
- ❌ node_modules/ (ignorado por .gitignore)
- ❌ serviceAccountKey.json (ignorado por .gitignore)

### 4.4 Verificar qué archivos se van a subir

```powershell
git status
```

**Deberías ver:**
```
Changes to be committed:
  new file:   .env
  new file:   .gitignore
  new file:   FIREBASE_SETUP.md
  new file:   README.md
  new file:   package.json
  new file:   server.js
  new file:   serviceAccountKey.json.example
```

**⚠️ IMPORTANTE:** NO debe aparecer `serviceAccountKey.json` (tus credenciales reales)

### 4.5 Hacer el primer commit

```powershell
git commit -m "Initial commit: SIAV backend with MQTT bridge"
```

**Resultado esperado:**
```
[main (root-commit) abc1234] Initial commit: SIAV backend with MQTT bridge
 7 files changed, XXX insertions(+)
 ...
```

### 4.6 Conectar con GitHub

Reemplaza `TU-USUARIO` con tu usuario de GitHub:

```powershell
git remote add origin https://github.com/TU-USUARIO/siav-backend.git
```

**Ejemplo:**
```powershell
git remote add origin https://github.com/juan123/siav-backend.git
```

### 4.7 Verificar que se conectó

```powershell
git remote -v
```

**Resultado esperado:**
```
origin  https://github.com/TU-USUARIO/siav-backend.git (fetch)
origin  https://github.com/TU-USUARIO/siav-backend.git (push)
```

### 4.8 Subir el código a GitHub

```powershell
git branch -M main
git push -u origin main
```

**¿Te pide usuario/contraseña?**
- Usuario: Tu usuario de GitHub
- Contraseña: **Personal Access Token** (no tu contraseña)

**Cómo crear Personal Access Token:**
1. GitHub → Settings (tu perfil) → Developer settings
2. Personal access tokens → Tokens (classic) → Generate new token
3. Nombre: "Railway Deploy"
4. Scopes: Marcar **repo** (todos los permisos de repositorio)
5. Generate token → **COPIA EL TOKEN** (lo verás solo una vez)
6. Usa ese token como contraseña

**Resultado esperado:**
```
Enumerating objects: 9, done.
Counting objects: 100% (9/9), done.
...
To https://github.com/TU-USUARIO/siav-backend.git
 * [new branch]      main -> main
```

### 4.9 Verificar en GitHub

1. Ve a `https://github.com/TU-USUARIO/siav-backend`
2. Deberías ver todos tus archivos
3. **Verifica que NO aparezca `serviceAccountKey.json`** ✅

---

## ✅ PASO 5: Crear cuenta en Railway.app

### 5.1 Ir a Railway

- https://railway.app/

### 5.2 Registrarte con GitHub

1. Click **"Login"** (arriba derecha)
2. Click **"Login with GitHub"**
3. Autoriza Railway a acceder a tu GitHub
4. Completa tu perfil (opcional)

### 5.3 Verificar que estás en el plan Hobby (gratis)

- Dashboard → Account Settings → Plan
- Debería decir: **"Hobby Plan - $5/month free credit"**

---

## ✅ PASO 6: Desplegar en Railway

### 6.1 Crear nuevo proyecto

1. En Railway Dashboard, click **"New Project"**

2. Selecciona **"Deploy from GitHub repo"**

3. **¿Te pide autorizar más permisos?**
   - Click "Configure GitHub App"
   - Selecciona tu cuenta
   - Da acceso a `siav-backend` (o "All repositories")
   - Save

4. Selecciona el repositorio: **`siav-backend`**

5. Click **"Deploy Now"**

Railway detectará automáticamente:
- ✅ Node.js project
- ✅ `npm install` (instala dependencias)
- ✅ `npm start` (ejecuta server.js)

### 6.2 Esperar el despliegue (1-2 minutos)

Verás logs en tiempo real:
```
Building...
npm install
npm start
✅ Deployment successful
```

**⚠️ PERO FALLARÁ** porque falta `serviceAccountKey.json`

---

## ✅ PASO 7: Configurar Firebase credentials en Railway

### 7.1 Convertir serviceAccountKey.json a variable de entorno

En tu PC, abre el archivo:

```powershell
notepad "C:\Users\romul\OneDrive\Desktop\9no Semestre\Sistemas Distribuidos\deteccion-velocidad\backend\serviceAccountKey.json"
```

**Copia TODO el contenido** (será algo como):
```json
{
  "type": "service_account",
  "project_id": "siav-sistema-vial",
  "private_key_id": "abc123...",
  ...
}
```

**⚠️ IMPORTANTE:** Copia TODO, desde `{` hasta `}` incluyendo las llaves.

### 7.2 Agregar variable de entorno en Railway

1. En Railway, click en tu proyecto `siav-backend`

2. Click en la pestaña **"Variables"**

3. Click **"+ New Variable"**

4. **Crear variable para Firebase:**
   ```
   Variable Name: FIREBASE_CREDENTIALS
   Value: (pega TODO el JSON que copiaste)
   ```

5. Click **"Add"**

6. **Crear variables del MQTT:**
   ```
   Variable Name: MQTT_BROKER
   Value: mqtt://test.mosquitto.org:1883
   ```
   Click "Add"

   ```
   Variable Name: MQTT_TOPIC
   Value: siav/eventos/test
   ```
   Click "Add"

### 7.3 Modificar server.js para usar variable de entorno

**Necesitamos editar `server.js` localmente** para que lea las credenciales desde la variable de entorno.

Abre `server.js` y busca esta sección (líneas 10-20 aproximadamente):

**ANTES:**
```javascript
let db;

try {
  // Intentar cargar serviceAccountKey.json
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log('✅ Firebase Admin SDK initialized with service account');
} catch (error) {
  console.error('❌ Error loading Firebase credentials:', error.message);
  console.log('⚠️  Create serviceAccountKey.json from Firebase Console:');
  console.log('   Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}
```

**DESPUÉS (modificar a esto):**
```javascript
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
  process.exit(1);
}
```

**Guarda el archivo.**

---

## ✅ PASO 8: Subir cambios a GitHub

### 8.1 Verificar cambios

```powershell
git status
```

### 8.2 Agregar cambios

```powershell
git add server.js
```

### 8.3 Commit

```powershell
git commit -m "Add environment variable support for Firebase credentials"
```

### 8.4 Push a GitHub

```powershell
git push origin main
```

**Railway detectará automáticamente el cambio y volverá a desplegar** (auto-deploy).

---

## ✅ PASO 9: Verificar el despliegue exitoso

### 9.1 Ver logs en Railway

1. En Railway → Tu proyecto → Deployments
2. Click en el último deployment
3. Ver logs en tiempo real

**Deberías ver:**
```
✅ Using Firebase credentials from environment variable
✅ Firebase Admin SDK initialized successfully
✅ Connected to MQTT Broker: mqtt://test.mosquitto.org:1883
📩 Subscribed to topic: siav/eventos/test (QoS 1)
🚀 SIAV Backend Server running on port XXXX
```

### 9.2 Obtener la URL pública

1. En Railway → Tu proyecto → Settings
2. Click **"Generate Domain"** (botón morado)
3. Railway generará una URL tipo:
   ```
   https://siav-backend-production.up.railway.app
   ```

**COPIA ESTA URL** - la necesitarás para Flutter.

### 9.3 Probar que funciona

Abre en tu navegador:
```
https://TU-URL-DE-RAILWAY.railway.app/
```

**Deberías ver:**
```json
{
  "status": "SIAV Backend Running",
  "version": "1.0.0",
  "mqtt": {
    "connected": true,
    "broker": "mqtt://test.mosquitto.org:1883",
    "topic": "siav/eventos/test"
  },
  "firebase": {
    "connected": true
  },
  "uptime": 123.45
}
```

### 9.4 Probar el endpoint de estadísticas

```
https://TU-URL-DE-RAILWAY.railway.app/stats
```

**Deberías ver:**
```json
{
  "totalEventos": 5,
  "totalInfracciones": 2
}
```

---

## ✅ PASO 10: Probar con el Publisher local

### 10.1 Publicar evento desde tu PC

```powershell
cd "C:\Users\romul\OneDrive\Desktop\9no Semestre\Sistemas Distribuidos\deteccion-velocidad\hardware\simulator"
python publisher.py --count 1
```

### 10.2 Verificar en Railway Logs

En Railway → Deployments → Logs en tiempo real

**Deberías ver:**
```
📨 Received event from siav/eventos/test:
   Device: SIM_ESP32_001
   Speed: 72.5 km/h
   Direction: norte
   Infraction: 🚨 YES
✅ Event saved to Firestore: abc123xyz
🚨 Infraction record created
```

### 10.3 Verificar en Firebase Console

1. Ir a Firebase Console: https://console.firebase.google.com/
2. Tu proyecto → Firestore Database
3. Colección `eventos_trafico`
4. **Deberías ver el nuevo evento**

---

## ✅ PASO 11: Probar endpoint de eventos recientes

En el navegador:
```
https://TU-URL-DE-RAILWAY.railway.app/eventos/recientes?limit=5
```

**Deberías ver un array con tus eventos:**
```json
[
  {
    "id": "abc123",
    "velocidad": 72.5,
    "direccion": "norte",
    "esInfraccion": true,
    ...
  }
]
```

---

## 🎉 ¡DESPLIEGUE EXITOSO!

Tu backend está:
- ✅ Corriendo 24/7 en Railway
- ✅ Escuchando MQTT en tiempo real
- ✅ Guardando eventos en Firestore
- ✅ Exponiendo API REST públicamente

---

## 📝 Información importante para guardar

**URL de tu backend:**
```
https://[TU-URL].railway.app
```

**Endpoints disponibles:**
- `GET /` - Health check
- `GET /stats` - Estadísticas
- `GET /eventos/recientes?limit=10` - Últimos eventos
- `GET /generar-reporte?fecha=2025-10-24` - Generar reporte
- `GET /reportes` - Reportes históricos

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'serviceAccountKey.json'"
**Solución:** Asegúrate de haber agregado `FIREBASE_CREDENTIALS` en Variables de Railway.

### Error: "MQTT Connection refused"
**Solución:** Verifica que `MQTT_BROKER` esté configurado correctamente en Railway Variables.

### Error: "Permission denied" en Firestore
**Solución:** Verifica las reglas de Firestore (debe estar en modo test).

### El deployment dice "Crashed"
**Solución:** Ve a Logs en Railway y busca el error específico.

---

## 🔄 Cómo actualizar el backend después

Cada vez que hagas cambios:

```powershell
cd backend
git add .
git commit -m "Descripción del cambio"
git push origin main
```

Railway **automáticamente** detectará el cambio y volverá a desplegar.

---

## 📊 Monitorear uso y costos

1. Railway Dashboard → Usage
2. Verás:
   - Crédito usado: $X.XX / $5.00
   - Días hasta reset: XX días
   - Uso de recursos

**Tu proyecto debería usar ~$1-2 USD/mes** ✅

---

**¿Listo para el siguiente paso?** 
Ahora puedes conectar tu Flutter app a esta URL pública. 📱
