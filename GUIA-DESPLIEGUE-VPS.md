# 🚀 Guía de Despliegue al VPS

## ✅ Checklist ANTES de subir al VPS

### 1. **VAPID Keys - GENERAR AHORA** ⚠️

Las VAPID keys se generan **ANTES** de subir al VPS. Son necesarias para las notificaciones push.

**Generar VAPID Keys:**

```bash
cd server
node scripts/generate-vapid-keys.js
```

Esto generará:
- `VAPID_PUBLIC_KEY` - Se usa en el frontend
- `VAPID_PRIVATE_KEY` - Se usa en el backend (NUNCA exponer)
- `VAPID_SUBJECT` - Email de contacto (ej: mailto:admin@tudominio.com)

**Guarda estas claves en un lugar seguro** - Las necesitarás para configurar el `.env` en el VPS.

### 2. **PWA - CONFIGURAR AHORA** ✅

El PWA ya está configurado en el código, pero necesita:
- ✅ Build de producción (se hace en el VPS)
- ✅ HTTPS (se configura en el VPS)
- ✅ Service Worker (ya está en el código)

**No necesitas hacer nada más ahora**, solo asegurarte de que el build de producción funcione.

### 3. **Variables de Entorno - PREPARAR**

Necesitarás estos archivos `.env`:

**Backend (`server/.env`):**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alquiler_cancha
DB_USER=postgres
DB_PASSWORD=tu_password_postgres

# Server
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=tu_clave_secreta_super_segura_aqui
JWT_EXPIRES_IN=7d

# Frontend URL (tu dominio con HTTPS)
FRONTEND_URL=https://tudominio.com

# Email (opcional pero recomendado)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=noreply@tudominio.com

# VAPID Keys (las que generaste antes)
VAPID_PUBLIC_KEY=tu_vapid_public_key_aqui
VAPID_PRIVATE_KEY=tu_vapid_private_key_aqui
VAPID_SUBJECT=mailto:admin@tudominio.com

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

**Frontend (`client/.env`):**
```env
REACT_APP_API_URL=https://tudominio.com/api
REACT_APP_VAPID_PUBLIC_KEY=tu_vapid_public_key_aqui
```

### 4. **Base de Datos - PREPARAR**

Asegúrate de tener:
- ✅ PostgreSQL instalado en el VPS
- ✅ Base de datos creada
- ✅ Usuario de PostgreSQL con permisos
- ✅ Scripts de migración listos

### 5. **GitHub - PREPARAR**

Necesitarás:
- ✅ Repositorio en GitHub (público o privado)
- ✅ Acceso SSH al VPS
- ✅ Node.js y npm instalados en el VPS
- ✅ PM2 o similar para procesos (recomendado)

---

## 📋 Información que necesito para el despliegue

Por favor, proporciona:

1. **Datos del VPS:**
   - IP o dominio del servidor
   - Usuario SSH (ej: root, ubuntu, etc.)
   - ¿Tienes acceso SSH configurado?

2. **Base de Datos:**
   - ¿PostgreSQL ya está instalado?
   - ¿Tienes la contraseña de PostgreSQL?
   - ¿Prefieres que creemos la BD o ya existe?

3. **Dominio/HTTPS:**
   - ¿Tienes un dominio configurado?
   - ¿Tienes certificado SSL (Let's Encrypt)?
   - ¿Qué dominio usarás? (ej: canchas.tudominio.com)

4. **GitHub:**
   - URL del repositorio
   - ¿Es público o privado?
   - ¿Tienes acceso desde el VPS?

5. **Email (opcional):**
   - ¿Tienes cuenta de Gmail para enviar correos?
   - ¿O prefieres otro servicio?

---

## 🔧 Pasos del Despliegue (después de tener la info)

1. **Conectar al VPS y clonar repositorio**
2. **Instalar dependencias** (Node.js, PostgreSQL, etc.)
3. **Configurar variables de entorno**
4. **Crear base de datos y ejecutar migraciones**
5. **Build del frontend** (npm run build)
6. **Configurar servidor web** (Nginx para servir frontend y proxy al backend)
7. **Configurar HTTPS** (Let's Encrypt)
8. **Configurar PM2** para mantener procesos activos
9. **Probar todo** y verificar que funcione

---

## ⚠️ IMPORTANTE

- **VAPID Keys**: Se generan UNA VEZ y se usan en producción
- **PWA**: Ya está configurado, solo necesita HTTPS
- **HTTPS**: Es OBLIGATORIO para PWA y Push Notifications
- **Service Worker**: Solo funciona en producción con HTTPS

---

## 🎯 Siguiente Paso

**Genera las VAPID keys ahora:**
```bash
cd server
node scripts/generate-vapid-keys.js
```

Luego pásame la información del checklist anterior y procedo con el despliegue.

