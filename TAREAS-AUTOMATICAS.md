# Tareas Automáticas del Sistema

## Cancelación Automática de Reservas Vencidas

El sistema incluye una tarea programada que cancela automáticamente las reservas que no han sido pagadas dentro del plazo configurado.

### Configuración

1. **Días Máximos para Pagar**: Configurable en "Configuración" → "Días Máximos para Pagar" (por defecto: 3 días)

2. **Horario de Ejecución**: 
   - Por defecto: Todos los días a las 2:00 AM (hora de Lima, Perú)
   - Configurable mediante variable de entorno `HORARIO_CANCELAR_RESERVAS`

### Variables de Entorno (Opcional)

Puedes agregar estas variables en `server/.env`:

```env
# Horario de ejecución (formato cron)
# Ejemplos:
# '0 2 * * *' = todos los días a las 2:00 AM
# '0 */6 * * *' = cada 6 horas
# '0 0 * * *' = todos los días a medianoche
HORARIO_CANCELAR_RESERVAS=0 2 * * *

# Zona horaria
TIMEZONE=America/Lima

# Ejecutar tareas inmediatamente al iniciar (solo para desarrollo)
EJECUTAR_TAREAS_INMEDIATAMENTE=false
```

### Ejecución Manual

Si necesitas ejecutar la tarea manualmente:

```bash
# Desde la raíz del proyecto
cd server
npm run cancelar-vencidas

# O directamente
node server/scripts/cancelar-reservas-vencidas.js
```

### Cómo Funciona

1. La tarea se ejecuta automáticamente según el horario configurado
2. Busca todas las reservas con estado "pendiente" que:
   - No tienen un pago confirmado
   - Fueron creadas hace más de X días (según configuración)
3. Cancela automáticamente esas reservas
4. Libera los espacios para nuevas reservas
5. Registra en consola cuántas reservas fueron canceladas

### Logs

La tarea registra en la consola del servidor:
- ✅ Reservas canceladas exitosamente
- ⚠️ Si no hay reservas vencidas
- ❌ Errores si ocurren

### Notas

- La tarea se inicia automáticamente cuando el servidor arranca
- No requiere configuración adicional si usas los valores por defecto
- La zona horaria por defecto es "America/Lima" (Perú)
- Puedes cambiar el horario editando la variable de entorno o el código



