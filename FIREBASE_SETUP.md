# 🔥 Guía Rápida: Configurar Firebase para SIAV

## Paso 1: Crear Proyecto Firebase

1. **Ir a Firebase Console:**
   - https://console.firebase.google.com/

2. **Crear nuevo proyecto:**
   - Click "Add project" (Agregar proyecto)
   - Nombre: `siav-sistema-vial`
   - Google Analytics: Opcional (puedes deshabilitarlo para empezar rápido)
   - Click "Create project"

## Paso 2: Habilitar Cloud Firestore

1. **En el menú lateral, ir a:**
   - Build → Firestore Database

2. **Click "Create database"**

3. **Configuración:**
   - Location: `us-central` (Iowa) - más cercano a México
   - **Security rules:** Selecciona "Start in test mode"
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if request.time < timestamp.date(2025, 12, 31);
         }
       }
     }
     ```
   - Click "Enable"

## Paso 3: Crear Colecciones (Opcional - se crean automáticamente)

Las colecciones se crearán automáticamente cuando el servidor escriba el primer evento:
- `eventos_trafico`
- `infracciones`
- `reportes_diarios`

Pero si quieres crearlas manualmente:

1. **En Firestore Database:**
   - Click "Start collection"
   - Collection ID: `eventos_trafico`
   - Document ID: (deja que se genere automáticamente)
   - Agrega un campo de prueba:
     - Field: `test`
     - Type: `string`
     - Value: `hello`
   - Click "Save"
   - **Luego elimina este documento de prueba**

2. **Repite para:**
   - `infracciones`
   - `reportes_diarios`

## Paso 4: Descargar Credenciales (Service Account Key)

1. **Ir a Project Settings:**
   - Click en el ⚙️ (engranaje) arriba a la izquierda
   - Click "Project settings"

2. **Ir a la pestaña "Service accounts"**

3. **Generar nueva clave privada:**
   - Click "Generate new private key"
   - **¡IMPORTANTE!** Aparecerá una advertencia de seguridad
   - Click "Generate key"
   - Se descargará un archivo JSON

4. **Renombrar y mover el archivo:**
   ```powershell
   # En Windows PowerShell
   # Asumiendo que se descargó en Downloads/
   Move-Item "$env:USERPROFILE\Downloads\siav-sistema-vial-*.json" "c:\Users\romul\OneDrive\Desktop\9no Semestre\Sistemas Distribuidos\deteccion-velocidad\backend\serviceAccountKey.json"
   ```

   O manualmente:
   - Renombra el archivo descargado a: `serviceAccountKey.json`
   - Muévelo a la carpeta `backend/`

## Paso 5: Verificar la Configuración

1. **Abrir `serviceAccountKey.json` y verificar que tiene:**
   ```json
   {
     "type": "service_account",
     "project_id": "siav-sistema-vial",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "firebase-adminsdk-xxxxx@siav-sistema-vial.iam.gserviceaccount.com",
     ...
   }
   ```

2. **El campo `project_id` debe ser el nombre de tu proyecto**

## Paso 6: Probar la Conexión

```powershell
# En la carpeta backend/
npm start
```

**Deberías ver:**
```
✅ Firebase Admin SDK initialized with service account
✅ Connected to MQTT Broker: mqtt://test.mosquitto.org:1883
📩 Subscribed to topic: siav/eventos/test (QoS 1)

============================================================
🚀 SIAV Backend Server running on port 3000
============================================================
📍 Health check: http://localhost:3000/
📊 Statistics:   http://localhost:3000/stats
📋 Recent events: http://localhost:3000/eventos/recientes
📈 Generate report: http://localhost:3000/generar-reporte
============================================================
```

## Paso 7: Enviar Evento de Prueba

**Terminal 1 (Backend corriendo):**
```powershell
npm start
```

**Terminal 2 (Publisher):**
```powershell
cd ..\hardware\simulator
python publisher.py --count 1
```

**Deberías ver en el backend:**
```
📨 Received event from siav/eventos/test:
   Device: SIM_ESP32_001
   Speed: 72.5 km/h
   Direction: norte
   Infraction: 🚨 YES
✅ Event saved to Firestore: abc123xyz
🚨 Infraction record created
```

## Paso 8: Verificar en Firebase Console

1. **Volver a Firestore Database**
2. **Ver la colección `eventos_trafico`**
   - Deberías ver tu primer documento con los datos del evento

3. **Si hubo infracción, ver `infracciones`**
   - Deberías ver el registro de la infracción

## 🎉 ¡Listo!

Tu backend está funcionando y conectado a Firebase. Ahora puedes:
- Publicar eventos desde el simulador
- Ver los datos en Firestore
- Generar reportes con: `http://localhost:3000/generar-reporte`

---

## ⚠️ Seguridad IMPORTANTE

**Antes de desplegar a producción:**

1. **Cambiar reglas de Firestore:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /eventos_trafico/{document} {
         allow read: if true;  // Lectura pública
         allow write: if false;  // Solo el backend puede escribir
       }
       match /infracciones/{document} {
         allow read: if true;
         allow write: if false;
       }
       match /reportes_diarios/{document} {
         allow read: if true;
         allow write: if false;
       }
     }
   }
   ```

2. **NUNCA subir `serviceAccountKey.json` a GitHub**
   - Ya está en `.gitignore`
   - Para Railway, usar variables de entorno o secretos

---

## 🐛 Problemas Comunes

### Error: "Cannot find module './serviceAccountKey.json'"
❌ No descargaste las credenciales  
✅ Descarga el Service Account Key (Paso 4)

### Error: "Permission denied" en Firestore
❌ Reglas muy restrictivas  
✅ Usa "test mode" o ajusta las reglas

### Error: "ECONNREFUSED" al iniciar
❌ Puerto 3000 ocupado  
✅ Cambia el `PORT` en `.env` a 3001

### No se guardan eventos en Firestore
❌ Credenciales incorrectas o broker MQTT no conectado  
✅ Verifica logs del servidor y que el publisher esté corriendo
