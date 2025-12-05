-- Base de datos para Sistema de Alquiler de Canchas Sintéticas
-- Tabla de usuarios (todos los tipos: admin, empleado, usuario)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telefono VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'empleado', 'usuario')),
    activo BOOLEAN DEFAULT true,
    avatar VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de canchas
CREATE TABLE IF NOT EXISTS canchas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    capacidad INTEGER DEFAULT 10,
    activa BOOLEAN DEFAULT true,
    imagen VARCHAR(255),
    hora_inicio_atencion TIME DEFAULT '08:00:00',
    hora_fin_atencion TIME DEFAULT '23:00:00',
    precio_30min DECIMAL(10, 2) DEFAULT 25.00,
    precio_1hora DECIMAL(10, 2) DEFAULT 50.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de costos por hora
CREATE TABLE IF NOT EXISTS costos (
    id SERIAL PRIMARY KEY,
    cancha_id INTEGER REFERENCES canchas(id) ON DELETE CASCADE,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    costo DECIMAL(10, 2) NOT NULL,
    dia_semana INTEGER CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo, 6=sábado, NULL=todos los días
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reservas/alquileres
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    cancha_id INTEGER REFERENCES canchas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    empleado_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- Empleado que hizo la reserva
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    costo_total DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER REFERENCES reservas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    monto DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('online', 'deposito', 'efectivo')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'rechazado')),
    comprobante VARCHAR(255), -- URL de imagen del comprobante de depósito
    referencia_pago VARCHAR(100), -- Referencia de pago online
    fecha_pago TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuraciones (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(50) DEFAULT 'texto', -- texto, numero, booleano, json, imagen
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'info', -- info, reserva, pago, sistema
    relacionado_tipo VARCHAR(50), -- reserva, pago, etc
    relacionado_id INTEGER,
    leida BOOLEAN DEFAULT false,
    enviada_push BOOLEAN DEFAULT false,
    enviada_email BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de suscripciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(dni);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_reservas_cancha ON reservas(cancha_id);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_pagos_reserva ON pagos(reserva_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canchas_updated_at BEFORE UPDATE ON canchas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuraciones_updated_at BEFORE UPDATE ON configuraciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Datos iniciales
INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES
('nombre_empresa', 'Canchas Sintéticas', 'texto', 'Nombre de la empresa'),
('color_principal', '#22c55e', 'texto', 'Color principal del sitio (verde)'),
('color_secundario', '#16a34a', 'texto', 'Color secundario del sitio'),
('logo', '', 'imagen', 'Logo de la empresa'),
('titulo_landing', 'Reserva tu Cancha Sintética', 'texto', 'Título principal del landing'),
('subtitulo_landing', 'Disfruta del mejor fútbol en nuestras canchas', 'texto', 'Subtítulo del landing'),
('email_bienvenida_asunto', 'Bienvenido a Canchas Sintéticas', 'texto', 'Asunto del correo de bienvenida'),
('email_bienvenida_cuerpo', '<h1>Bienvenido {{nombre}}</h1><p>Tu usuario es tu DNI: {{dni}}</p><p>Tu contraseña inicial es tu DNI. Por favor cámbiala después del primer acceso.</p>', 'texto', 'Cuerpo del correo de bienvenida'),
('email_reserva_asunto', 'Reserva Confirmada - Cancha {{cancha}}', 'texto', 'Asunto del correo de reserva'),
('email_reserva_cuerpo', '<p>Tu reserva para la cancha {{cancha}} el {{fecha}} de {{hora_inicio}} a {{hora_fin}} ha sido confirmada.</p>', 'texto', 'Cuerpo del correo de reserva (texto adicional opcional)'),
('email_reserva_cancelada_asunto', 'Reserva Cancelada - Cancha {{cancha}}', 'texto', 'Asunto del correo cuando se cancela una reserva'),
('email_reserva_cancelada_cuerpo', '<p>Tu reserva para la cancha {{cancha}} el {{fecha}} de {{hora_inicio}} a {{hora_fin}} ha sido cancelada.</p>', 'texto', 'Cuerpo del correo de reserva cancelada'),
('email_pago_asunto', 'Pago Registrado - Cancha {{cancha}}', 'texto', 'Asunto del correo cuando se registra un pago'),
('email_pago_cuerpo', '<p>Hemos registrado tu pago por la reserva de la cancha {{cancha}} el {{fecha}} de {{hora_inicio}} a {{hora_fin}} por un monto de S/.{{monto}} ({{metodo}}).</p>', 'texto', 'Cuerpo del correo de pago realizado'),
('email_recordatorio_asunto', 'Recordatorio de Reserva - Cancha {{cancha}}', 'texto', 'Asunto del correo de recordatorio el mismo día'),
('email_recordatorio_cuerpo', '<p>Hola {{nombre}},</p><p>Te recordamos que <strong>hoy</strong> tienes una reserva en la cancha {{cancha}} el {{fecha}} de {{hora_inicio}} a {{hora_fin}}.</p><p>Te recomendamos llegar 10 minutos antes para el calentamiento y registro.</p>', 'texto', 'Cuerpo del correo de recordatorio de reserva')
ON CONFLICT (clave) DO NOTHING;

-- Crear usuario administrador por defecto (DNI: 12345678, password: 12345678)
-- La contraseña debe ser hasheada con bcrypt
-- INSERT INTO usuarios (dni, nombre, apellido, password, rol) VALUES
-- ('12345678', 'Admin', 'Sistema', '$2a$10$...', 'admin');

