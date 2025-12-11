-- ============================================
-- SCRIPT PARA EJECUTAR TODAS LAS MIGRACIONES
-- ============================================
-- Ejecutar en orden:
-- sudo -u postgres psql -d alquiler_cancha -f EJECUTAR-TODAS-LAS-MIGRACIONES.sql

-- 1. Agregar precios y horarios a canchas (si no existen)
ALTER TABLE canchas 
ADD COLUMN IF NOT EXISTS hora_inicio_atencion TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS hora_fin_atencion TIME DEFAULT '23:00:00',
ADD COLUMN IF NOT EXISTS precio_30min DECIMAL(10, 2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS precio_1hora DECIMAL(10, 2) DEFAULT 50.00;

-- 2. Agregar precios por turno (día/noche) a canchas
ALTER TABLE canchas 
ADD COLUMN IF NOT EXISTS precio_30min_dia DECIMAL(10, 2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS precio_1hora_dia DECIMAL(10, 2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS precio_30min_noche DECIMAL(10, 2) DEFAULT 35.00,
ADD COLUMN IF NOT EXISTS precio_1hora_noche DECIMAL(10, 2) DEFAULT 70.00,
ADD COLUMN IF NOT EXISTS hora_limite_turno TIME DEFAULT '18:00:00';

-- 3. Actualizar constraint de métodos de pago
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_pago_check 
CHECK (metodo_pago IN ('online', 'deposito', 'efectivo', 'yape', 'transferencia'));

-- 4. Agregar configuración de días máximos para pago
INSERT INTO configuraciones (clave, valor, tipo, descripcion)
VALUES ('dias_max_pago', '3', 'numero', 'Días máximos para realizar el pago de una reserva antes de cancelarse automáticamente')
ON CONFLICT (clave) DO NOTHING;

-- 5. Agregar configuración de email para recordatorios
INSERT INTO configuraciones (clave, valor, tipo, descripcion)
VALUES ('email_recordatorio', 'true', 'booleano', 'Activar/desactivar envío de emails de recordatorio de reservas')
ON CONFLICT (clave) DO NOTHING;

-- 6. Crear tabla cancha_personal (asignación de personal a canchas)
CREATE TABLE IF NOT EXISTS cancha_personal (
    id SERIAL PRIMARY KEY,
    cancha_id INTEGER NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evitar asignaciones duplicadas del mismo usuario a la misma cancha
CREATE UNIQUE INDEX IF NOT EXISTS idx_cancha_personal_unica
ON cancha_personal (cancha_id, usuario_id);

-- 7. Crear tablas de mensajes/alertas
CREATE TABLE IF NOT EXISTS mensajes (
    id SERIAL PRIMARY KEY,
    remitente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_envio VARCHAR(50) NOT NULL CHECK (tipo_envio IN ('todos', 'empleados', 'usuarios', 'cancha', 'especificos')),
    cancha_id INTEGER REFERENCES canchas(id) ON DELETE CASCADE,
    asunto VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    enviar_email BOOLEAN DEFAULT false,
    enviar_notificacion BOOLEAN DEFAULT false,
    enviar_push BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mensaje_destinatarios (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES mensajes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    email_enviado BOOLEAN DEFAULT false,
    notificacion_enviada BOOLEAN DEFAULT false,
    push_enviado BOOLEAN DEFAULT false,
    leido BOOLEAN DEFAULT false,
    fecha_leido TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mensajes
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes(remitente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_tipo_envio ON mensajes(tipo_envio);
CREATE INDEX IF NOT EXISTS idx_mensajes_cancha ON mensajes(cancha_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON mensajes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_mensaje ON mensaje_destinatarios(mensaje_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_usuario ON mensaje_destinatarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensaje_destinatarios_leido ON mensaje_destinatarios(leido);

-- ============================================
-- FIN DE LAS MIGRACIONES
-- ============================================

