# Sistema de Alquiler de Canchas Sintéticas ⚽

Sistema completo para gestión de alquiler de canchas sintéticas con roles de administrador, empleado y usuario.

## 🚀 Tecnologías

- **Frontend:** React + Tailwind CSS + PWA
- **Backend:** Node.js + Express
- **Base de Datos:** PostgreSQL
- **Notificaciones:** Push Notifications + Email HTML
- **Deployment:** Hostinger VPS

## 📋 Características

- ✅ Gestión completa de canchas sintéticas
- ✅ Sistema de reservas con vista semanal
- ✅ Roles: Administrador, Empleado, Usuario
- ✅ Sistema de pagos (online y depósito)
- ✅ Notificaciones push y correos HTML
- ✅ PWA para móviles y tablets
- ✅ Landing page atractiva
- ✅ Todo administrable (colores, logo, textos, correos)

## 🛠️ Instalación

```bash
# Instalar dependencias de todos los módulos
npm run install-all

# Configurar variables de entorno
cp server/.env.example server/.env
# Editar server/.env con tus credenciales

# Crear base de datos PostgreSQL
# Ejecutar scripts en server/database/migrations/

# Iniciar desarrollo
npm run dev
```

## 📁 Estructura del Proyecto

```
sistema-alquilercancha/
├── client/          # Frontend React
├── server/          # Backend Node.js
├── database/        # Scripts SQL
└── docs/           # Documentación
```

## 🔐 Credenciales por Defecto

- **Admin:** DNI como usuario y contraseña inicial
- Los usuarios pueden cambiar su contraseña después del primer login

## 📱 PWA

El sistema está configurado como PWA para instalación en dispositivos móviles.

## 🌐 Deployment

Ver `docs/DEPLOYMENT.md` para instrucciones de deployment en Hostinger VPS.


