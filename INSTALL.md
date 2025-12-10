# Guía de Instalación

## Requisitos Previos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

## Pasos de Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/sistema-alquilercancha.git
cd sistema-alquilercancha
```

### 2. Instalar Dependencias

```bash
npm run install-all
```

Esto instalará las dependencias del proyecto raíz, del servidor y del cliente.

### 3. Configurar Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb alquiler_cancha

# O usando psql
psql -U postgres
CREATE DATABASE alquiler_cancha;
\q

# Ejecutar schema
psql -U postgres -d alquiler_cancha -f server/database/schema.sql
```

### 4. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp server/.env.example server/.env

# Editar server/.env con tus credenciales
nano server/.env
```

Configurar al menos:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` (generar uno seguro)
- `FRONTEND_URL` (http://localhost:3000 para desarrollo)

### 5. Crear Usuario Administrador

```bash
cd server
node database/init-admin.js
```

Esto creará un usuario administrador con:
- DNI: `12345678`
- Contraseña: `12345678`

**IMPORTANTE:** Cambia la contraseña después del primer acceso.

### 6. Iniciar Servidor de Desarrollo

```bash
# Desde la raíz del proyecto
npm run dev
```

Esto iniciará:
- Backend en http://localhost:5000
- Frontend en http://localhost:3000

### 7. Acceder al Sistema

1. Abre http://localhost:3000
2. Haz clic en "Iniciar Sesión"
3. Usa las credenciales del admin:
   - DNI: `12345678`
   - Contraseña: `12345678`

## Estructura de Carpetas

```
sistema-alquilercancha/
├── client/              # Frontend React
│   ├── src/
│   │   ├── pages/      # Páginas
│   │   ├── components/  # Componentes
│   │   └── services/   # Servicios API
│   └── public/
├── server/              # Backend Node.js
│   ├── routes/         # Rutas API
│   ├── services/       # Servicios (email, notificaciones)
│   ├── database/       # Scripts SQL y conexión
│   └── middleware/     # Middleware (auth, etc)
└── docs/               # Documentación
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia frontend y backend

# Solo backend
npm run server           # Solo servidor Node.js

# Solo frontend
npm run client           # Solo React

# Build producción
npm run build            # Build del frontend
```

## Solución de Problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `server/.env`
- Asegúrate de que la base de datos existe

### Error al iniciar el servidor
- Verifica que el puerto 5000 esté disponible
- Revisa los logs en la consola

### Error al iniciar el cliente
- Verifica que el puerto 3000 esté disponible
- Reinstala dependencias: `cd client && npm install`

## Próximos Pasos

1. Configurar correo electrónico en `server/.env`
2. Configurar VAPID keys para notificaciones push
3. Personalizar configuración desde el panel de admin
4. Revisar `docs/DEPLOYMENT.md` para producción



