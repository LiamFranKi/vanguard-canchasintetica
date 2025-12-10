# 📨 Módulo de Mensajes/Alertas

## Descripción

Sistema completo de comunicación entre administradores, empleados y usuarios del sistema de alquiler de canchas.

## Funcionalidades

### 👨‍💼 Administrador puede enviar mensajes a:

1. **Todos** (`tipo_envio: 'todos'`)
   - Envía a todos los empleados y usuarios del sistema

2. **Solo Empleados** (`tipo_envio: 'empleados'`)
   - Envía a todos los usuarios con rol 'empleado'

3. **Solo Usuarios** (`tipo_envio: 'usuarios'`)
   - Envía a todos los usuarios con rol 'usuario'

4. **Usuarios Específicos** (`tipo_envio: 'especificos'`)
   - Selecciona usuarios específicos de una lista
   - Los destinatarios se guardan en la tabla `mensaje_destinatarios`

### 👔 Empleado puede enviar mensajes a:

1. **Usuarios de sus Canchas** (`tipo_envio: 'cancha'`)
   - Envía mensajes a usuarios que han reservado canchas asignadas al empleado
   - Se filtra automáticamente por las canchas asignadas en `cancha_personal`
   - Puede seleccionar una cancha específica o todas sus canchas

## Canales de Envío

Cada mensaje puede enviarse por uno o más canales:

- ✅ **Email**: Envía correo electrónico HTML
- ✅ **Notificación Sistema**: Crea notificación en la tabla `notificaciones`
- ✅ **Push Notification**: Envía notificación push al dispositivo

## Estructura de Base de Datos

### Tabla `mensajes`

```sql
- id: ID único del mensaje
- remitente_id: ID del usuario que envía (admin o empleado)
- titulo: Título del mensaje
- mensaje: Contenido del mensaje
- tipo_envio: Tipo de envío (todos, empleados, usuarios, especificos, cancha)
- cancha_id: ID de cancha (solo para tipo_envio = 'cancha')
- enviar_email: Boolean - enviar por email
- enviar_notificacion: Boolean - crear notificación sistema
- enviar_push: Boolean - enviar push notification
- created_at: Fecha de creación
- updated_at: Fecha de actualización
```

### Tabla `mensaje_destinatarios`

```sql
- id: ID único
- mensaje_id: ID del mensaje
- usuario_id: ID del usuario destinatario
- leido: Boolean - si el usuario leyó el mensaje
- leido_at: Fecha de lectura
- enviado_email: Boolean - si se envió email
- enviado_notificacion: Boolean - si se creó notificación
- enviado_push: Boolean - si se envió push
- created_at: Fecha de creación
```

## Instalación

1. Abre **pgAdmin4**
2. Conecta a tu base de datos
3. Abre **Query Tool** (Herramienta de Consulta)
4. Abre el archivo: `server/database/migrations/add_mensajes_alertas_COMPLETO.sql`
5. Copia todo el contenido
6. Pégalo en Query Tool
7. Ejecuta (F5 o botón Execute)

## Uso del Módulo

### Para Administrador

1. **Enviar a Todos**
   - Selecciona "Enviar a Todos"
   - Escribe título y mensaje
   - Selecciona canales de envío
   - Envía

2. **Enviar a Empleados**
   - Selecciona "Solo Empleados"
   - Escribe título y mensaje
   - Selecciona canales de envío
   - Envía

3. **Enviar a Usuarios**
   - Selecciona "Solo Usuarios"
   - Escribe título y mensaje
   - Selecciona canales de envío
   - Envía

4. **Enviar a Usuarios Específicos**
   - Selecciona "Usuarios Específicos"
   - Busca y selecciona usuarios de la lista
   - Escribe título y mensaje
   - Selecciona canales de envío
   - Envía

### Para Empleado

1. **Enviar a Usuarios de Mis Canchas**
   - Selecciona cancha (o "Todas mis canchas")
   - El sistema muestra usuarios que reservaron esa cancha
   - Escribe título y mensaje
   - Selecciona canales de envío
   - Envía

## Ejemplos de Casos de Uso

### Ejemplo 1: Admin notifica mantenimiento
- **Tipo**: Enviar a Todos
- **Título**: "Mantenimiento Programado"
- **Mensaje**: "Las canchas estarán cerradas el día X para mantenimiento"
- **Canales**: Email + Notificación Sistema + Push

### Ejemplo 2: Admin instruye empleados
- **Tipo**: Solo Empleados
- **Título**: "Nueva Política de Reservas"
- **Mensaje**: "A partir de mañana, seguir el nuevo protocolo..."
- **Canales**: Email + Notificación Sistema

### Ejemplo 3: Empleado notifica cancelación
- **Tipo**: Cancha (Cancha 1)
- **Título**: "Cancha 1 Temporalmente Cerrada"
- **Mensaje**: "La Cancha 1 estará cerrada hoy por lluvia. Contactar para reprogramar."
- **Canales**: Email + Push

### Ejemplo 4: Admin notifica promoción a usuarios específicos
- **Tipo**: Usuarios Específicos
- **Selecciona**: Usuarios frecuentes
- **Título**: "Promoción Especial"
- **Mensaje**: "Tienes 20% de descuento en tu próxima reserva"
- **Canales**: Email + Push

## Integración con Sistema Existente

El módulo se integra con:

- ✅ **Sistema de Notificaciones**: Crea registros en `notificaciones`
- ✅ **Sistema de Email**: Usa `emailService` existente
- ✅ **Sistema de Push**: Usa `notificationService` existente
- ✅ **Tabla de Usuarios**: Referencia `usuarios` para roles
- ✅ **Tabla de Canchas**: Referencia `canchas` para filtrado
- ✅ **Tabla cancha_personal**: Usa asignaciones para empleados

## Notas Importantes

1. **Permisos**: 
   - Solo admin puede enviar a "todos", "empleados", "usuarios"
   - Empleados solo pueden enviar a usuarios de sus canchas

2. **Filtrado Automático**:
   - Cuando empleado envía por cancha, solo se incluyen usuarios que tienen reservas activas o pasadas de esa cancha

3. **Rendimiento**:
   - Los índices están optimizados para búsquedas rápidas
   - Las consultas usan JOINs eficientes

4. **Seguridad**:
   - Los mensajes se eliminan en cascada si se elimina el remitente
   - Los destinatarios se eliminan si se elimina el mensaje

## Próximos Pasos

Después de ejecutar el script SQL, se debe implementar:

1. **Backend** (`server/routes/mensajes.js`):
   - Endpoints para crear mensajes
   - Endpoints para listar mensajes recibidos
   - Endpoints para marcar como leído
   - Lógica de envío por email, notificación y push

2. **Frontend**:
   - Página de Admin para enviar mensajes
   - Página de Empleado para enviar mensajes
   - Página de Usuario para ver mensajes recibidos
   - Componentes de formulario y listado

