-- Agregar configuración de días máximos para pagar después de reservar
INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES
('dias_max_pago', '3', 'numero', 'Días máximos para realizar el pago después de crear la reserva. Si pasa este tiempo sin pagar, la reserva se cancela automáticamente.')
ON CONFLICT (clave) DO NOTHING;



