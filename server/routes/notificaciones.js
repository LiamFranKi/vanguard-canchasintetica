const express = require('express');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Obtener notificaciones del usuario
router.get('/', authenticate, async (req, res) => {
  try {
    const { leida } = req.query;
    let sql = 'SELECT * FROM notificaciones WHERE usuario_id = $1';
    const params = [req.user.id];
    let paramCount = 2;

    if (leida !== undefined) {
      sql += ` AND leida = $${paramCount++}`;
      params.push(leida === 'true');
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Marcar notificación como leída
router.put('/:id/leer', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      'UPDATE notificaciones SET leida = true WHERE id = $1 AND usuario_id = $2',
      [id, req.user.id]
    );
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error marcando notificación:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Marcar todas como leídas
router.put('/leer-todas', authenticate, async (req, res) => {
  try {
    await query(
      'UPDATE notificaciones SET leida = true WHERE usuario_id = $1',
      [req.user.id]
    );
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error marcando notificaciones:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Suscribirse a push notifications
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ message: 'Datos de suscripción incompletos' });
    }

    // Verificar si ya existe
    const existing = await query(
      'SELECT id FROM push_subscriptions WHERE usuario_id = $1 AND endpoint = $2',
      [req.user.id, endpoint]
    );

    if (existing.rows.length > 0) {
      // Actualizar
      await query(
        'UPDATE push_subscriptions SET p256dh = $1, auth = $2 WHERE id = $3',
        [keys.p256dh, keys.auth, existing.rows[0].id]
      );
    } else {
      // Crear nueva
      await query(
        'INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)',
        [req.user.id, endpoint, keys.p256dh, keys.auth]
      );
    }

    res.json({ message: 'Suscripción guardada correctamente' });
  } catch (error) {
    console.error('Error guardando suscripción:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;


