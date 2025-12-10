-- Migración para agregar campos de horario y precios a canchas
ALTER TABLE canchas 
ADD COLUMN IF NOT EXISTS hora_inicio_atencion TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS hora_fin_atencion TIME DEFAULT '23:00:00',
ADD COLUMN IF NOT EXISTS precio_30min DECIMAL(10, 2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS precio_1hora DECIMAL(10, 2) DEFAULT 50.00;



