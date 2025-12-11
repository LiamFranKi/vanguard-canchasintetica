# Configuración de Zona Horaria

## Problema
Las reservas de hoy están mostrando la fecha de ayer debido a problemas de zona horaria.

## Solución

### 1. Backend (Node.js)

Ya configurado en:
- `server/index.js` - Configura `process.env.TZ` al inicio
- `server/database/connection.js` - Configura zona horaria en la conexión PostgreSQL
- `server/routes/reservas.js` - Usa `.local()` en todas las comparaciones de fechas

### 2. PostgreSQL

**Ejecutar en pgAdmin4 o desde psql:**

```sql
-- Configurar zona horaria para la base de datos
ALTER DATABASE alquiler_cancha SET timezone = 'America/Lima';

-- Verificar
SHOW timezone;
```

**O ejecutar el script:**
```bash
sudo -u postgres psql -d alquiler_cancha -f /var/www/canchas/server/database/migrations/configurar_timezone.sql
```

### 3. Sistema Operativo (VPS)

**Verificar zona horaria actual:**
```bash
timedatectl
```

**Configurar zona horaria (si es necesario):**
```bash
sudo timedatectl set-timezone America/Lima
```

**Verificar:**
```bash
date
```

### 4. Reiniciar Servicios

Después de configurar PostgreSQL:

```bash
# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Reiniciar backend (PM2)
cd /var/www/canchas
pm2 restart canchas-backend
```

### 5. Verificar

1. Crear una reserva para hoy
2. Verificar que la fecha sea correcta
3. Verificar en la base de datos:
```sql
SELECT fecha, created_at, NOW() FROM reservas ORDER BY id DESC LIMIT 1;
```

## Variables de Entorno

Asegúrate de tener en `server/.env`:

```env
TIMEZONE=America/Lima
```

## Notas

- La zona horaria por defecto es `America/Lima` (Perú)
- Todos los `moment()` ahora usan `.local()` para usar la zona horaria del sistema
- PostgreSQL debe estar configurado con la misma zona horaria

