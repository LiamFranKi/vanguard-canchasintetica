-- ============================================================================
-- SCRIPT COMPLETO: Módulo de Mensajes/Alertas
-- ============================================================================
-- Este script crea el sistema completo de mensajes/alertas para:
-- - Administrador puede enviar mensajes a empleados, usuarios o ambos
-- - Empleados pueden enviar mensajes a usuarios que reservaron sus canchas
-- - Los mensajes se envían por Email, Notificaciones del Sistema y Push
-- 
-- INSTRUCCIONES:
-- 1. Abre pgAdmin4
-- 2. Conecta a tu base de datos
-- 3. Abre Query Tool (Herramienta de Consulta)
-- 4. Copia y pega todo este script
-- 5. Ejecuta (F5 o botón Execute)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLA PRINCIPAL DE MENSAJES/ALERTAS
-- ============================================================================
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

-- ============================================================================
-- 2. TABLA DE DESTINATARIOS ESPECÍFICOS
-- ============================================================================
-- Para cuando se envía a usuarios específicos (tipo_envio = 'especificos')
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

-- ============================================================================
-- 3. ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes(remitente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_tipo_envio ON mensajes(tipo_envio);
CREATE INDEX IF NOT EXISTS idx_mensajes_cancha ON mensajes(cancha_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON mensajes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_mensaje ON mensaje_destinatarios(mensaje_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_usuario ON mensaje_destinatarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_leido ON mensaje_destinatarios(leido);

-- ============================================================================
-- 4. TRIGGER PARA ACTUALIZAR updated_at
-- ============================================================================
-- (El trigger update_updated_at_column() ya debería existir del schema.sql)
CREATE TRIGGER update_mensajes_updated_at BEFORE UPDATE ON mensajes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TABLE mensajes IS 'Tabla principal de mensajes/alertas del sistema. Permite comunicación entre admin, empleados y usuarios.';
COMMENT ON COLUMN mensajes.remitente_id IS 'ID del usuario que envía el mensaje (admin o empleado)';
COMMENT ON COLUMN mensajes.titulo IS 'Título del mensaje';
COMMENT ON COLUMN mensajes.mensaje IS 'Contenido del mensaje';
COMMENT ON COLUMN mensajes.tipo_envio IS 'Tipo de envío: todos (todos), empleados (solo empleados), usuarios (solo usuarios), especificos (usuarios seleccionados), cancha (usuarios de canchas del empleado)';
COMMENT ON COLUMN mensajes.cancha_id IS 'ID de cancha (solo para tipo_envio = cancha, cuando empleado envía a usuarios que reservaron sus canchas asignadas)';
COMMENT ON COLUMN mensajes.enviar_email IS 'Indica si se debe enviar el mensaje por email';
COMMENT ON COLUMN mensajes.enviar_notificacion IS 'Indica si se debe crear notificación en el sistema';
COMMENT ON COLUMN mensajes.enviar_push IS 'Indica si se debe enviar notificación push';

COMMENT ON TABLE mensaje_destinatarios IS 'Tabla de relación entre mensajes y destinatarios específicos (para tipo_envio = especificos)';
COMMENT ON COLUMN mensaje_destinatarios.mensaje_id IS 'ID del mensaje';
COMMENT ON COLUMN mensaje_destinatarios.usuario_id IS 'ID del usuario destinatario';
COMMENT ON COLUMN mensaje_destinatarios.leido IS 'Indica si el destinatario ha leído el mensaje';
COMMENT ON COLUMN mensaje_destinatarios.leido_at IS 'Fecha y hora en que se leyó el mensaje';
COMMENT ON COLUMN mensaje_destinatarios.enviado_email IS 'Indica si se envió el email a este destinatario';
COMMENT ON COLUMN mensaje_destinatarios.enviado_notificacion IS 'Indica si se creó notificación en el sistema para este destinatario';
COMMENT ON COLUMN mensaje_destinatarios.enviado_push IS 'Indica si se envió push notification a este destinatario';

-- ============================================================================
-- 6. VERIFICACIÓN FINAL
-- ============================================================================
-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensajes') THEN
        RAISE NOTICE '✅ Tabla mensajes creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear la tabla mensajes';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensaje_destinatarios') THEN
        RAISE NOTICE '✅ Tabla mensaje_destinatarios creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear la tabla mensaje_destinatarios';
    END IF;
    
    RAISE NOTICE '✅ Módulo de Mensajes/Alertas instalado correctamente';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Funcionalidades disponibles:';
    RAISE NOTICE '   - Admin puede enviar a: todos, empleados, usuarios, usuarios específicos';
    RAISE NOTICE '   - Empleados pueden enviar a: usuarios que reservaron sus canchas';
    RAISE NOTICE '   - Envío por: Email, Notificaciones Sistema, Push Notifications';
END $$;

COMMIT;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

