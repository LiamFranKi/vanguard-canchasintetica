const webpush = require('web-push');
const { query } = require('../database/connection');

// Configurar VAPID keys (solo si están configuradas y no están vacías)
if (process.env.VAPID_PUBLIC_KEY && 
    process.env.VAPID_PRIVATE_KEY && 
    process.env.VAPID_PUBLIC_KEY.trim() !== '' && 
    process.env.VAPID_PRIVATE_KEY.trim() !== '' &&
    process.env.VAPID_PUBLIC_KEY !== 'your_vapid_public_key' &&
    process.env.VAPID_PRIVATE_KEY !== 'your_vapid_private_key') {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@canchas.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (error) {
    console.warn('⚠️ VAPID keys no válidas, las notificaciones push estarán deshabilitadas:', error.message);
  }
}

const createNotification = async (usuario_id, data) => {
  try {
    const { titulo, mensaje, tipo, relacionado_tipo, relacionado_id } = data;

    const result = await query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, relacionado_tipo, relacionado_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [usuario_id, titulo, mensaje, tipo || 'info', relacionado_tipo || null, relacionado_id || null]
    );

    const notification = result.rows[0];

    // Enviar push notification
    await sendPushNotification(usuario_id, notification);

    return notification;
  } catch (error) {
    console.error('Error creando notificación:', error);
    throw error;
  }
};

const sendPushNotification = async (usuario_id, notification) => {
  try {
    // Obtener suscripciones del usuario
    const subscriptions = await query(
      'SELECT * FROM push_subscriptions WHERE usuario_id = $1',
      [usuario_id]
    );

    if (subscriptions.rows.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: notification.titulo,
      body: notification.mensaje,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        tipo: notification.tipo,
        relacionado_tipo: notification.relacionado_tipo,
        relacionado_id: notification.relacionado_id
      }
    });

    // Enviar a todas las suscripciones
    const promises = subscriptions.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        );
      } catch (err) {
        console.error('Error enviando push notification:', err);
        // Si la suscripción es inválida (410 = Gone), eliminarla
        if (err.statusCode === 410) {
          console.log(`Eliminando suscripción expirada ID: ${sub.id} para usuario: ${usuario_id}`);
          try {
            await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
            console.log(`Suscripción ${sub.id} eliminada correctamente`);
          } catch (deleteError) {
            console.error('Error eliminando suscripción expirada:', deleteError);
          }
        }
        // Re-lanzar el error para que Promise.allSettled lo capture
        throw err;
      }
    });

    await Promise.allSettled(promises);

    // Marcar como enviada
    await query(
      'UPDATE notificaciones SET enviada_push = true WHERE id = $1',
      [notification.id]
    );
  } catch (error) {
    console.error('Error enviando push notification:', error);
  }
};

const markAsRead = async (notificacion_id, usuario_id) => {
  try {
    await query(
      'UPDATE notificaciones SET leida = true WHERE id = $1 AND usuario_id = $2',
      [notificacion_id, usuario_id]
    );
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  sendPushNotification,
  markAsRead
};

