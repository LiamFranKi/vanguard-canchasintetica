-- Migración: Agregar módulo de Mensajes/Alertas
-- Fecha: 2025-01-XX
-- Descripción: Sistema de mensajes/alertas para comunicación entre admin, empleados y usuarios

-- Tabla principal de mensajes/alertas
CREATE TABLE IF NOT EXISTS mensajes (
    id SERIAL PRIMARY KEY,
    remitente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo_envio VARCHAR(50) DEFAULT 'todos' CHECK (tipo_envio IN ('todos', 'empleados', 'usuarios', 'especificos', 'cancha')),
    -- tipo_envio:
    -- 'todos' = Admin envía a todos (empleados + usuarios)
    -- 'empleados' = Admin envía a todos los empleados
    -- 'usuarios' = Admin envía a todos los usuarios
    -- 'especificos' = Admin/Empleado envía a usuarios específicos seleccionados
    -- 'cancha' = Empleado envía a usuarios que reservaron sus canchas asignadas
    cancha_id INTEGER REFERENCES canchas(id) ON DELETE SET NULL, -- Solo para tipo_envio = 'cancha'
    enviar_email BOOLEAN DEFAULT true,
    enviar_notificacion BOOLEAN DEFAULT true,
    enviar_push BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de destinatarios específicos (para tipo_envio = 'especificos')
CREATE TABLE IF NOT EXISTS mensaje_destinatarios (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    leido BOOLEAN DEFAULT false,
    leido_at TIMESTAMP,
    enviado_email BOOLEAN DEFAULT false,
    enviado_notificacion BOOLEAN DEFAULT false,
    enviado_push BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mensaje_id, usuario_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes(remitente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_tipo_envio ON mensajes(tipo_envio);
CREATE INDEX IF NOT EXISTS idx_mensajes_cancha ON mensajes(cancha_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON mensajes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_mensaje ON mensaje_destinatarios(mensaje_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_usuario ON mensaje_destinatarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_leido ON mensaje_destinatarios(leido);

-- Trigger para actualizar updated_at en mensajes
CREATE TRIGGER update_mensajes_updated_at BEFORE UPDATE ON mensajes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE mensajes IS 'Tabla principal de mensajes/alertas del sistema';
COMMENT ON COLUMN mensajes.remitente_id IS 'ID del usuario que envía el mensaje (admin o empleado)';
COMMENT ON COLUMN mensajes.tipo_envio IS 'Tipo de envío: todos, empleados, usuarios, especificos, cancha';
COMMENT ON COLUMN mensajes.cancha_id IS 'ID de cancha (solo para tipo_envio = cancha, cuando empleado envía a usuarios de sus canchas)';
COMMENT ON COLUMN mensajes.enviar_email IS 'Indica si se debe enviar por email';
COMMENT ON COLUMN mensajes.enviar_notificacion IS 'Indica si se debe crear notificación en el sistema';
COMMENT ON COLUMN mensajes.enviar_push IS 'Indica si se debe enviar notificación push';

COMMENT ON TABLE mensaje_destinatarios IS 'Tabla de relación entre mensajes y destinatarios específicos';
COMMENT ON COLUMN mensaje_destinatarios.leido IS 'Indica si el destinatario ha leído el mensaje';
COMMENT ON COLUMN mensaje_destinatarios.enviado_email IS 'Indica si se envió el email a este destinatario';
COMMENT ON COLUMN mensaje_destinatarios.enviado_notificacion IS 'Indica si se creó notificación en el sistema para este destinatario';
COMMENT ON COLUMN mensaje_destinatarios.enviado_push IS 'Indica si se envió push notification a este destinatario';

