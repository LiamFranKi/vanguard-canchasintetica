# Changelog

## [1.2.0] - 2025-01-XX

### Agregado
- **Números de contacto en cards de canchas (Rol Usuario)**: Las cards de canchas disponibles ahora muestran "N° de Contactos:" con los teléfonos de todos los empleados asignados a esa cancha, separados por "-"
- **Botones de WhatsApp en reservas (Rol Usuario)**: Cada card de reserva individual ahora muestra botones de WhatsApp con los números de contacto específicos de la cancha de esa reserva, permitiendo enviar comprobantes de pago directamente
- **Tabs de Reservas Nuevas y Pasadas (Rol Usuario)**: Se agregaron tabs para separar las reservas futuras (fecha >= hoy) de las reservas pasadas (fecha < hoy) en la página "Mis Reservas"
- **Mensaje de pago por WhatsApp**: Cada reserva muestra un mensaje destacado: "Puedes mandar el capture de tu Yape o Depósito a estos números:" con botones de WhatsApp para contactar a los empleados asignados

### Mejorado
- **Endpoint de canchas**: Ahora incluye los contactos de empleados asignados cuando el usuario tiene rol "usuario"
- **Endpoint de reservas**: Ahora incluye un array `contactos` con los teléfonos de empleados asignados a cada cancha cuando el usuario tiene rol "usuario"
- **UX de pagos**: Los usuarios pueden contactar directamente por WhatsApp a los empleados responsables de cada cancha desde cada reserva individual

### Corregido
- **Landing page redirect**: Corregido el problema donde el landing page redirigía al login. Ahora el endpoint de canchas permite acceso público para mostrar canchas activas sin autenticación
- **Interceptor de axios**: Actualizado para no redirigir al login si el usuario está en la landing page o en la página de login

## [1.1.0] - 2025-01-XX

### Cambiado
- **Estado de reservas al pagar**: Al pagar una reserva, el estado ahora se establece como "completada" en lugar de "confirmada", eliminando la necesidad del botón "Completar"
- **Lógica de botones en Reservas**: El botón "Editar" ya no aparece cuando una reserva está pagada (estado completada)
- **Nombre del remitente en emails**: Los correos ahora muestran el nombre de la empresa configurado (ej: "Canchas Vanguard") en lugar de un nombre genérico
- **AdminHorarios**: Agregados botones de "Pagar", "Cancelar" y "Eliminar" en el modal de edición de reservas
- **AdminHorarios**: Eliminados los botones "+30 min" y "-30 min" del formulario de edición

### Mejorado
- **Backend queries**: Todos los queries de disponibilidad ahora incluyen el estado "completada" junto con "confirmada" y "pendiente"
- **Filtros de reservas**: Los filtros de "Reservas Pagadas" ahora buscan correctamente reservas con estado "completada"
- **Dashboards**: Actualizados para mostrar reservas con estado "completada" correctamente

### Corregido
- **Botón Editar**: Ya no aparece incorrectamente en reservas pagadas
- **Email sender name**: El nombre del remitente ahora usa la configuración `nombre_empresa` de la base de datos

## [1.0.0] - 2024-01-XX

### Agregado
- Sistema completo de alquiler de canchas sintéticas
- Autenticación con roles (Admin, Empleado, Usuario)
- Gestión de canchas con imágenes
- Sistema de reservas con vista semanal
- Gestión de pagos (online, depósito, efectivo)
- Notificaciones push y correos HTML
- PWA para móviles y tablets
- Landing page con tema de fútbol
- Panel de administración completo
- Configuración personalizable (colores, logo, textos, correos)
- Vista de horarios semanales por cancha
- Sistema de costos por hora configurables
- Gestión de usuarios y empleados
- Dashboard para usuarios y administradores

### Características Técnicas
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Base de datos: PostgreSQL
- Autenticación: JWT
- PWA: Service Worker + Workbox
- Notificaciones: Web Push + Email (Nodemailer)

### Seguridad
- Contraseñas hasheadas con bcrypt
- Autenticación JWT
- Validación de datos con express-validator
- Protección de rutas por roles

### UI/UX
- Diseño responsive (web, móvil, tablet)
- Tema verde predominante (cancha de fútbol)
- Toast notifications con SweetAlert2
- Interfaz intuitiva y moderna


