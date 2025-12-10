-- Migración: Agregar campos de precios por turno (día/noche)
-- Fecha: 2025-01-XX

-- Agregar campos de precios por turno
ALTER TABLE canchas 
ADD COLUMN IF NOT EXISTS precio_30min_dia DECIMAL(10, 2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS precio_1hora_dia DECIMAL(10, 2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS precio_30min_noche DECIMAL(10, 2) DEFAULT 35.00,
ADD COLUMN IF NOT EXISTS precio_1hora_noche DECIMAL(10, 2) DEFAULT 70.00,
ADD COLUMN IF NOT EXISTS hora_limite_turno TIME DEFAULT '18:00:00';

-- Actualizar los valores de los campos antiguos a los nuevos campos de día (mantener compatibilidad)
UPDATE canchas 
SET precio_30min_dia = COALESCE(precio_30min, 25.00),
    precio_1hora_dia = COALESCE(precio_1hora, 50.00)
WHERE precio_30min_dia IS NULL OR precio_1hora_dia IS NULL;

-- Comentarios para documentación
COMMENT ON COLUMN canchas.precio_30min_dia IS 'Precio por 30 minutos en turno día';
COMMENT ON COLUMN canchas.precio_1hora_dia IS 'Precio por 1 hora en turno día';
COMMENT ON COLUMN canchas.precio_30min_noche IS 'Precio por 30 minutos en turno noche';
COMMENT ON COLUMN canchas.precio_1hora_noche IS 'Precio por 1 hora en turno noche';
COMMENT ON COLUMN canchas.hora_limite_turno IS 'Hora límite que separa turno día (antes) y turno noche (después). Por defecto 18:00';


