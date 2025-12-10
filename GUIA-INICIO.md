# 🚀 Guía de Inicio Paso a Paso

## Paso 1: Verificar Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- ✅ **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- ✅ **PostgreSQL 14+** - [Descargar aquí](https://www.postgresql.org/download/)
- ✅ **Git** (opcional, para control de versiones)

Verifica las instalaciones:
```bash
node --version
npm --version
psql --version
```

## Paso 2: Instalar Dependencias

Desde la raíz del proyecto, ejecuta:

```bash
npm run install-all
```

Este comando instalará todas las dependencias de:
- Proyecto raíz
- Servidor (backend)
- Cliente (frontend)

**⏱️ Tiempo estimado:** 5-10 minutos

## Paso 3: Configurar Base de Datos PostgreSQL

### 3.1. Crear la Base de Datos

Abre una terminal y ejecuta:

```bash
# Opción 1: Usando psql
psql -U postgres
CREATE DATABASE alquiler_cancha;
\q

# Opción 2: Usando createdb (si está disponible)
createdb -U postgres alquiler_cancha
```

### 3.2. Ejecutar el Schema SQL

```bash
# Desde la raíz del proyecto
psql -U postgres -d alquiler_cancha -f server/database/schema.sql
```

O si tienes contraseña:
```bash
psql -U postgres -d alquiler_cancha -f server/database/schema.sql
# Te pedirá la contraseña de PostgreSQL
```

**✅ Verificación:** Si todo salió bien, verás mensajes de "CREATE TABLE", "CREATE INDEX", etc.

## Paso 4: Configurar Variables de Entorno

### 4.1. Crear archivo .env

```bash
# Copiar el archivo de ejemplo
copy server\.env.example server\.env
```

O en PowerShell:
```powershell
Copy-Item server\.env.example server\.env
```

### 4.2. Editar el archivo .env

Abre `server/.env` y configura:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database - ⚠️ IMPORTANTE: Cambia estos valores
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alquiler_cancha
DB_USER=postgres
DB_PASSWORD=tu_contraseña_postgres

# JWT - ⚠️ IMPORTANTE: Cambia este valor en producción
JWT_SECRET=mi_clave_secreta_super_segura_cambiar_en_produccion
JWT_EXPIRES_IN=7d

# Email Configuration (opcional por ahora)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=noreply@canchas.com

# Push Notifications (opcional por ahora)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu_email@example.com

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:** Cambia al menos:
- `DB_PASSWORD` - Tu contraseña de PostgreSQL
- `JWT_SECRET` - Una clave secreta aleatoria y segura

## Paso 5: Crear Usuario Administrador

```bash
npm run init-db
```

O directamente:
```bash
cd server
node database/init-admin.js
```

**✅ Credenciales del Admin:**
- **DNI:** `12345678`
- **Contraseña:** `12345678`

**⚠️ IMPORTANTE:** Cambia esta contraseña después del primer acceso.

## Paso 6: Verificar que los Puertos Estén Libres

Antes de iniciar, asegúrate de que los puertos estén libres:

```bash
npm run kill
```

Este comando cerrará cualquier proceso que esté usando los puertos 3000 y 5000.

## Paso 7: Iniciar el Sistema

Desde la raíz del proyecto:

```bash
npm run dev
```

Esto iniciará:
- ✅ **Backend** en http://localhost:5000
- ✅ **Frontend** en http://localhost:3000

**⏱️ Tiempo estimado:** 30-60 segundos para que ambos servidores estén listos

Verás en la consola:
```
[SERVER] 🚀 Servidor corriendo en puerto 5000
[CLIENT] Compiled successfully!
[CLIENT] webpack compiled successfully
```

## Paso 8: Acceder al Sistema

1. **Abre tu navegador** y ve a: http://localhost:3000

2. **Verás la Landing Page** con el tema de fútbol

3. **Haz clic en "Iniciar Sesión"**

4. **Ingresa las credenciales del admin:**
   - DNI: `12345678`
   - Contraseña: `12345678`

5. **Serás redirigido al panel de administración**

## Paso 9: Configuración Inicial (Opcional)

Una vez dentro del panel de administración:

1. Ve a **Configuración** (`/admin/config`)
2. Personaliza:
   - Nombre de la empresa
   - Logo
   - Colores
   - Textos del landing
   - Correos de bienvenida y reserva

## Comandos Útiles

```bash
# Iniciar todo el sistema
npm run dev

# Cerrar todos los puertos
npm run kill

# Solo iniciar el servidor
npm run server

# Solo iniciar el cliente
npm run client

# Instalar todas las dependencias
npm run install-all

# Crear usuario admin
npm run init-db
```

## Solución de Problemas Comunes

### ❌ Error: "Puerto 5000 ya está en uso"
```bash
npm run kill
# Luego intenta de nuevo
npm run dev
```

### ❌ Error: "No se puede conectar a PostgreSQL"
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `server/.env`
- Asegúrate de que la base de datos existe

### ❌ Error: "Module not found"
```bash
npm run install-all
```

### ❌ Error: "Cannot find module 'concurrently'"
```bash
npm install
```

### ❌ El frontend no se conecta al backend
- Verifica que `FRONTEND_URL` en `.env` sea `http://localhost:3000`
- Verifica que el backend esté corriendo en el puerto 5000
- Revisa la consola del navegador para errores

## Próximos Pasos

1. ✅ Crear tu primera cancha desde `/admin/canchas`
2. ✅ Configurar costos por hora desde la edición de canchas
3. ✅ Crear usuarios de prueba desde `/admin/usuarios`
4. ✅ Hacer una reserva de prueba desde `/app/horarios`
5. ✅ Configurar correos y notificaciones

## 🎉 ¡Listo!

Tu sistema está funcionando. Ahora puedes:
- Crear canchas
- Configurar horarios y costos
- Crear usuarios
- Hacer reservas
- Gestionar pagos

¿Necesitas ayuda con algo más? ¡Sigue los pasos y avísame si encuentras algún problema!



