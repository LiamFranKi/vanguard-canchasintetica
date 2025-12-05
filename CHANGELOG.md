# Changelog

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


