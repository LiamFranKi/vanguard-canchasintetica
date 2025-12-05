-- Agregar configuraciones de correo de recordatorio
INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES
('email_recordatorio_asunto', 'Recordatorio de Reserva - Cancha {{cancha}}', 'texto', 'Asunto del correo de recordatorio el mismo día'),
('email_recordatorio_cuerpo', '<p>Hola {{nombre}},</p><p>Te recordamos que <strong>hoy</strong> tienes una reserva en la cancha {{cancha}} el {{fecha}} de {{hora_inicio}} a {{hora_fin}}.</p><p>Te recomendamos llegar 10 minutos antes para el calentamiento y registro.</p>', 'texto', 'Cuerpo del correo de recordatorio de reserva')
ON CONFLICT (clave) DO NOTHING;


