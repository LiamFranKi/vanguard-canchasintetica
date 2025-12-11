const cron = require('node-cron');
const { query } = require('../database/connection');
const moment = require('moment');
const emailService = require('./email');
const notificationService = require('./notifications');

/**
 * Tarea programada para cancelar reservas vencidas sin pago
 * Se ejecuta diariamente a las 2:00 AM
 */
const cancelarReservasVencidas = async () => {
  try {
    console.log('🔄 Ejecutando tarea: Cancelar reservas vencidas sin pago...');

    // Obtener días máximos de configuración
    const config = await query(
      "SELECT valor FROM configuraciones WHERE clave = 'dias_max_pago'"
    );
    const diasMax = parseInt(config.rows[0]?.valor || 3);

    // Buscar reservas pendientes que no tienen pago confirmado y han pasado los días máximos
    const fechaLimite = moment().local().subtract(diasMax, 'days').format('YYYY-MM-DD');
    
    const reservasVencidas = await query(
      `SELECT r.id, r.usuario_id, r.cancha_id, r.fecha, r.hora_inicio, 
              u.nombre || ' ' || u.apellido as usuario_nombre,
              c.nombre as cancha_nombre
       FROM reservas r
       LEFT JOIN pagos p ON r.id = p.reserva_id AND p.estado = 'confirmado'
       JOIN usuarios u ON r.usuario_id = u.id
       JOIN canchas c ON r.cancha_id = c.id
       WHERE r.estado = 'pendiente'
       AND p.id IS NULL
       AND DATE(r.created_at) <= $1`,
      [fechaLimite]
    );

    let canceladas = 0;
    for (const reserva of reservasVencidas.rows) {
      await query(
        'UPDATE reservas SET estado = $1 WHERE id = $2',
        ['cancelada', reserva.id]
      );
      canceladas++;
      
      console.log(`  ✓ Reserva cancelada: ${reserva.cancha_nombre} - ${reserva.usuario_nombre} - ${moment(reserva.fecha).format('DD/MM/YYYY')} ${reserva.hora_inicio}`);
    }

    if (canceladas > 0) {
      console.log(`✅ Se cancelaron ${canceladas} reserva(s) vencida(s) sin pago`);
    } else {
      console.log('✅ No hay reservas vencidas para cancelar');
    }

    return { canceladas, total: reservasVencidas.rows.length };
  } catch (error) {
    console.error('❌ Error en tarea de cancelar reservas vencidas:', error);
    throw error;
  }
};

/**
 * Tarea programada para enviar recordatorio el mismo día de la reserva
 * Se ejecuta diariamente a la hora configurada (por defecto 08:00)
 */
const enviarRecordatoriosReservaHoy = async () => {
  try {
    console.log('🔔 Ejecutando tarea: Enviar recordatorios de reservas de hoy...');

    const hoy = moment().local().format('YYYY-MM-DD');

    const reservasHoy = await query(
      `SELECT r.*, 
              c.nombre as cancha_nombre,
              u.nombre as usuario_nombre,
              u.apellido as usuario_apellido,
              u.email as usuario_email
       FROM reservas r
       JOIN canchas c ON r.cancha_id = c.id
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.fecha = $1
       AND r.estado = 'confirmada'`,
      [hoy]
    );

    let enviadas = 0;

    for (const r of reservasHoy.rows) {
      const nombreCompleto = `${r.usuario_nombre || ''} ${r.usuario_apellido || ''}`.trim();

      // Notificación push al usuario
      await notificationService.createNotification(r.usuario_id, {
        titulo: 'Recordatorio de Reserva',
        mensaje: `Hoy juegas en ${r.cancha_nombre} a las ${r.hora_inicio}`,
        tipo: 'recordatorio',
        relacionado_tipo: 'reserva',
        relacionado_id: r.id
      });

      // Correo al usuario (si tiene email)
      if (r.usuario_email) {
        try {
          await emailService.sendReminderEmail(
            r.usuario_email,
            nombreCompleto,
            {
              cancha_nombre: r.cancha_nombre,
              fecha: r.fecha,
              hora_inicio: r.hora_inicio,
              hora_fin: r.hora_fin,
              costo_total: r.costo_total
            }
          );
        } catch (e) {
          console.error('Error enviando correo de recordatorio al usuario:', e);
        }
      }

      // Notificación/correo al personal asignado
      const personal = await query(
        `SELECT u.id, u.email, u.nombre, u.apellido
         FROM cancha_personal cp
         JOIN usuarios u ON cp.usuario_id = u.id
         WHERE cp.cancha_id = $1`,
        [r.cancha_id]
      );

      for (const emp of personal.rows) {
        await notificationService.createNotification(emp.id, {
          titulo: 'Recordatorio de Reserva',
          mensaje: `Hoy hay una reserva en ${r.cancha_nombre} a las ${r.hora_inicio}`,
          tipo: 'recordatorio',
          relacionado_tipo: 'reserva',
          relacionado_id: r.id
        });

        if (emp.email) {
          try {
            await emailService.sendReminderEmail(
              emp.email,
              emp.nombre,
              {
                cancha_nombre: r.cancha_nombre,
                fecha: r.fecha,
                hora_inicio: r.hora_inicio,
                hora_fin: r.hora_fin,
                costo_total: r.costo_total
              }
            );
          } catch (e) {
            console.error('Error enviando correo de recordatorio al personal:', e);
          }
        }
      }

      enviadas++;
    }

    console.log(`✅ Recordatorios enviados: ${enviadas}`);
  } catch (error) {
    console.error('❌ Error en tarea de recordatorios de reservas:', error);
    throw error;
  }
};

/**
 * Inicializar todas las tareas programadas
 */
const iniciarTareasProgramadas = () => {
  console.log('⏰ Iniciando tareas programadas...');

  // Ejecutar inmediatamente al iniciar (opcional, para desarrollo)
  if (process.env.EJECUTAR_TAREAS_INMEDIATAMENTE === 'true') {
    console.log('⚠️  Ejecutando tareas inmediatamente (modo desarrollo)...');
    cancelarReservasVencidas().catch(console.error);
    enviarRecordatoriosReservaHoy().catch(console.error);
  }

  // Programar tarea diaria para cancelar reservas vencidas
  const horarioTareaCancelacion = process.env.HORARIO_CANCELAR_RESERVAS || '0 2 * * *';
  
  cron.schedule(horarioTareaCancelacion, async () => {
    await cancelarReservasVencidas();
  }, {
    scheduled: true,
    timezone: process.env.TIMEZONE || 'America/Lima'
  });

  // Programar tarea diaria para recordatorios (por defecto 8:00 AM)
  const horarioRecordatorio = process.env.HORARIO_RECORDATORIO_RESERVAS || '0 8 * * *';

  cron.schedule(horarioRecordatorio, async () => {
    await enviarRecordatoriosReservaHoy();
  }, {
    scheduled: true,
    timezone: process.env.TIMEZONE || 'America/Lima'
  });

  console.log('✅ Tareas programadas iniciadas:');
  console.log('   - Cancelar reservas vencidas: Diariamente a las 2:00 AM (Lima)');
  console.log('   - Recordatorio de reservas de hoy: Diario según HORARIO_RECORDATORIO_RESERVAS (por defecto 08:00, Lima)');
};

module.exports = {
  iniciarTareasProgramadas,
  cancelarReservasVencidas,
  enviarRecordatoriosReservaHoy
};

