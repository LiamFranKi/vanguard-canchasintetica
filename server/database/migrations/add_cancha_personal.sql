-- Tabla de asignación de personal a canchas
CREATE TABLE IF NOT EXISTS cancha_personal (
    id SERIAL PRIMARY KEY,
    cancha_id INTEGER NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Evitar asignaciones duplicadas del mismo usuario a la misma cancha
CREATE UNIQUE INDEX IF NOT EXISTS idx_cancha_personal_unica
ON cancha_personal (cancha_id, usuario_id);



