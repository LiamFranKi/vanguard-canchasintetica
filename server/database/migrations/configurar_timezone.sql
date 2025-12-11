-- Configurar zona horaria para PostgreSQL
-- Ejecutar este script en pgAdmin4 o desde psql

-- Configurar zona horaria para la sesión actual
SET timezone = 'America/Lima';

-- Configurar zona horaria para la base de datos
ALTER DATABASE alquiler_cancha SET timezone = 'America/Lima';

-- Verificar la configuración
SHOW timezone;

-- Nota: Para que los cambios sean permanentes en todas las conexiones,
-- también se debe configurar en postgresql.conf:
-- timezone = 'America/Lima'
-- 
-- Y reiniciar PostgreSQL:
-- sudo systemctl restart postgresql

