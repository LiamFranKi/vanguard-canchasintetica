const express = require('express');
const { query, transaction } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const emailService = require('../services/email');
const notificationService = require('../services/notifications');

const router = express.Router();

// Obtener usuarios para selección (admin y empleado)
router.get('/usuarios', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    const { search, rol } = req.query;
    let sql = 'SELECT id, dni, nombre, apellido, email, telefono, rol FROM usuarios WHERE activo = true';
    const params = [];
    let paramCount = 1;

    // Admin puede ver todos, empleado solo usuarios
    if (req.user.rol === 'empleado') {
      sql += ` AND rol = $${paramCount++}`;
      params.push('usuario');
    } else if (rol) {
      sql += ` AND rol = $${paramCount++}`;
      params.push(rol);
    }

    if (search) {
      sql += ` AND (dni ILIKE $${paramCount++} OR nombre ILIKE $${paramCount++} OR apellido ILIKE $${paramCount++})`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ' ORDER BY nombre, apellido LIMIT 100';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener usuarios que reservaron canchas del empleado
router.get('/usuarios-cancha/:cancha_id', authenticate, authorize('empleado'), async (req, res) => {
  try {
    const { cancha_id } = req.params;
    const empleadoId = req.user.id;

    // Verificar que el empleado está asignado a esta cancha
    const canchaCheck = await query(
      'SELECT 1 FROM cancha_personal WHERE cancha_id = $1 AND usuario_id = $2',
      [cancha_id, empleadoId]
    );

    if (canchaCheck.rows.length === 0) {
      return res.status(403).json({ message: 'No tienes acceso a esta cancha' });
    }

    // Obtener usuarios únicos que han reservado esta cancha
    const result = await query(
      `SELECT DISTINCT u.id, u.dni, u.nombre, u.apellido, u.email, u.telefono
       FROM reservas r
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.cancha_id = $1 AND u.activo = true
       ORDER BY u.nombre, u.apellido`,
      [cancha_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios de cancha:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener canchas asignadas al empleado
router.get('/mis-canchas', authenticate, authorize('empleado'), async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.nombre, c.descripcion
       FROM cancha_personal cp
       JOIN canchas c ON cp.cancha_id = c.id
       WHERE cp.usuario_id = $1 AND c.activa = true
       ORDER BY c.nombre`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo canchas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear mensaje
router.post('/', authenticate, authorize('admin', 'empleado'), [
  body('titulo').notEmpty().withMessage('El título es requerido'),
  body('mensaje').notEmpty().withMessage('El mensaje es requerido'),
  body('tipo_envio').isIn(['todos', 'empleados', 'usuarios', 'especificos', 'cancha']).withMessage('Tipo de envío inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { titulo, mensaje, tipo_envio, cancha_id, usuarios_ids, enviar_email, enviar_notificacion, enviar_push } = req.body;
    const remitenteId = req.user.id;

    // Validaciones según rol
    if (req.user.rol === 'empleado') {
      if (tipo_envio !== 'cancha' && tipo_envio !== 'especificos') {
        return res.status(403).json({ message: 'Los empleados solo pueden enviar a usuarios de sus canchas o usuarios específicos' });
      }

      if (tipo_envio === 'cancha' && !cancha_id) {
        return res.status(400).json({ message: 'Debes seleccionar una cancha' });
      }

      if (tipo_envio === 'cancha') {
        // Verificar que el empleado está asignado a esta cancha
        const canchaCheck = await query(
          'SELECT 1 FROM cancha_personal WHERE cancha_id = $1 AND usuario_id = $2',
          [cancha_id, remitenteId]
        );

        if (canchaCheck.rows.length === 0) {
          return res.status(403).json({ message: 'No tienes acceso a esta cancha' });
        }
      }
    }

    if (tipo_envio === 'especificos' && (!usuarios_ids || usuarios_ids.length === 0)) {
      return res.status(400).json({ message: 'Debes seleccionar al menos un destinatario' });
    }

    // Crear mensaje
    const mensajeResult = await query(
      `INSERT INTO mensajes (remitente_id, titulo, mensaje, tipo_envio, cancha_id, enviar_email, enviar_notificacion, enviar_push)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        remitenteId,
        titulo,
        mensaje,
        tipo_envio,
        tipo_envio === 'cancha' ? cancha_id : null,
        enviar_email !== false,
        enviar_notificacion !== false,
        enviar_push !== false
      ]
    );

    const mensajeCreado = mensajeResult.rows[0];

    // Obtener destinatarios según tipo_envio
    let destinatarios = [];

    if (tipo_envio === 'todos') {
      // Todos los usuarios activos
      const result = await query('SELECT id, nombre, apellido, email FROM usuarios WHERE activo = true');
      destinatarios = result.rows;
    } else if (tipo_envio === 'empleados') {
      // Solo empleados
      const result = await query("SELECT id, nombre, apellido, email FROM usuarios WHERE activo = true AND rol = 'empleado'");
      destinatarios = result.rows;
    } else if (tipo_envio === 'usuarios') {
      // Solo usuarios
      const result = await query("SELECT id, nombre, apellido, email FROM usuarios WHERE activo = true AND rol = 'usuario'");
      destinatarios = result.rows;
    } else if (tipo_envio === 'especificos') {
      // Usuarios específicos
      const placeholders = usuarios_ids.map((_, i) => `$${i + 1}`).join(',');
      const result = await query(
        `SELECT id, nombre, apellido, email FROM usuarios WHERE id IN (${placeholders}) AND activo = true`,
        usuarios_ids
      );
      destinatarios = result.rows;
    } else if (tipo_envio === 'cancha') {
      // Usuarios que reservaron esta cancha
      const result = await query(
        `SELECT DISTINCT u.id, u.nombre, u.apellido, u.email
         FROM reservas r
         JOIN usuarios u ON r.usuario_id = u.id
         WHERE r.cancha_id = $1 AND u.activo = true`,
        [cancha_id]
      );
      destinatarios = result.rows;
    }

    // Guardar destinatarios específicos si es necesario
    if (tipo_envio === 'especificos' || tipo_envio === 'cancha') {
      for (const dest of destinatarios) {
        await query(
          `INSERT INTO mensaje_destinatarios (mensaje_id, usuario_id)
           VALUES ($1, $2)`,
          [mensajeCreado.id, dest.id]
        );
      }
    }

    // Responder inmediatamente al cliente
    res.json({
      message: 'Mensaje creado correctamente. El envío se está procesando en segundo plano.',
      mensaje: mensajeCreado,
      destinatarios_count: destinatarios.length
    });

    // Procesar envío en segundo plano (no bloquea la respuesta)
    setImmediate(async () => {
      try {
        await enviarMensajesEnSegundoPlano(mensajeCreado, destinatarios, tipo_envio, titulo, mensaje, {
          enviar_email: enviar_email !== false,
          enviar_notificacion: enviar_notificacion !== false,
          enviar_push: enviar_push !== false
        });
      } catch (error) {
        console.error('Error procesando envío de mensajes en segundo plano:', error);
      }
    });
  } catch (error) {
    console.error('Error creando mensaje:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Función para enviar mensajes en segundo plano
const enviarMensajesEnSegundoPlano = async (mensajeCreado, destinatarios, tipo_envio, titulo, mensaje, opcionesEnvio) => {
  const promises = destinatarios.map(async (destinatario) => {
      const envios = [];

      // Email
      if (opcionesEnvio.enviar_email && destinatario.email) {
        try {
          const companyName = await query("SELECT valor FROM configuraciones WHERE clave = 'nombre_empresa'");
          const nombreEmpresa = companyName.rows[0]?.valor || 'Canchas Sintéticas';
          
          const html = `
            <h2>${titulo}</h2>
            <p>Hola ${destinatario.nombre} ${destinatario.apellido},</p>
            <div class="info-box">
              ${mensaje.split('\n').map(p => `<p>${p}</p>`).join('')}
            </div>
            <p><em>Este es un mensaje del sistema ${nombreEmpresa}</em></p>
          `;

          await emailService.sendEmail(
            destinatario.email,
            titulo,
            html
          );

          if (tipo_envio === 'especificos' || tipo_envio === 'cancha') {
            await query(
              'UPDATE mensaje_destinatarios SET enviado_email = true WHERE mensaje_id = $1 AND usuario_id = $2',
              [mensajeCreado.id, destinatario.id]
            );
          }
          envios.push('email');
        } catch (error) {
          console.error(`Error enviando email a ${destinatario.email}:`, error);
        }
      }

      // Notificación sistema
      if (opcionesEnvio.enviar_notificacion) {
        try {
          await notificationService.createNotification(destinatario.id, {
            titulo: titulo,
            mensaje: mensaje,
            tipo: 'sistema',
            relacionado_tipo: 'mensaje',
            relacionado_id: mensajeCreado.id
          });

          if (tipo_envio === 'especificos' || tipo_envio === 'cancha') {
            await query(
              'UPDATE mensaje_destinatarios SET enviado_notificacion = true WHERE mensaje_id = $1 AND usuario_id = $2',
              [mensajeCreado.id, destinatario.id]
            );
          }
          envios.push('notificacion');
        } catch (error) {
          console.error(`Error creando notificación para usuario ${destinatario.id}:`, error);
        }
      }

      // Push notification (ya se envía automáticamente en createNotification)
      if (opcionesEnvio.enviar_push && (tipo_envio === 'especificos' || tipo_envio === 'cancha')) {
        try {
          await query(
            'UPDATE mensaje_destinatarios SET enviado_push = true WHERE mensaje_id = $1 AND usuario_id = $2',
            [mensajeCreado.id, destinatario.id]
          );
        } catch (error) {
          console.error(`Error actualizando push para usuario ${destinatario.id}:`, error);
        }
      }

      return envios;
    });

    await Promise.allSettled(promises);
    console.log(`✅ Envío completado para mensaje ${mensajeCreado.id}: ${destinatarios.length} destinatarios procesados`);
};

// Obtener mensajes enviados (admin y empleado)
router.get('/enviados', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, 
              COUNT(DISTINCT md.usuario_id) as destinatarios_count,
              COUNT(DISTINCT CASE WHEN md.leido = true THEN md.usuario_id END) as leidos_count
       FROM mensajes m
       LEFT JOIN mensaje_destinatarios md ON m.id = md.mensaje_id
       WHERE m.remitente_id = $1
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo mensajes enviados:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener mensajes recibidos (usuarios)
router.get('/recibidos', authenticate, async (req, res) => {
  try {
    const { leido } = req.query;
    const usuarioId = req.user.id;

    // Mensajes específicos (con destinatarios)
    let sqlEspecificos = `
      SELECT m.*, md.leido, md.leido_at,
             u.nombre || ' ' || u.apellido as remitente_nombre,
             u.rol as remitente_rol
      FROM mensajes m
      JOIN mensaje_destinatarios md ON m.id = md.mensaje_id
      JOIN usuarios u ON m.remitente_id = u.id
      WHERE md.usuario_id = $1
    `;
    const paramsEspecificos = [usuarioId];
    
    if (leido !== undefined) {
      sqlEspecificos += ` AND md.leido = $2`;
      paramsEspecificos.push(leido === 'true');
    }
    
    sqlEspecificos += ' ORDER BY m.created_at DESC';
    
    const mensajesEspecificos = await query(sqlEspecificos, paramsEspecificos);

    // Mensajes masivos (todos, empleados, usuarios)
    // Primero obtener el rol del usuario actual
    const usuarioRol = await query('SELECT rol FROM usuarios WHERE id = $1', [usuarioId]);
    const rolUsuario = usuarioRol.rows[0]?.rol || 'usuario';

    let sqlMasivos = `
      SELECT m.*, 
             CASE WHEN EXISTS (
               SELECT 1 FROM mensaje_destinatarios md2 
               WHERE md2.mensaje_id = m.id AND md2.usuario_id = $1 AND md2.leido = true
             ) THEN true ELSE false END as leido,
             (SELECT leido_at FROM mensaje_destinatarios md3 
              WHERE md3.mensaje_id = m.id AND md3.usuario_id = $1 LIMIT 1) as leido_at,
             u.nombre || ' ' || u.apellido as remitente_nombre,
             u.rol as remitente_rol
      FROM mensajes m
      JOIN usuarios u ON m.remitente_id = u.id
      WHERE (
        (m.tipo_envio = 'todos') OR
        (m.tipo_envio = 'usuarios' AND $2 = 'usuario') OR
        (m.tipo_envio = 'empleados' AND $2 = 'empleado')
      )
    `;
    const paramsMasivos = [usuarioId, rolUsuario];

    if (leido !== undefined) {
      const leidoBool = leido === 'true';
      sqlMasivos += ` AND (
        CASE WHEN EXISTS (
          SELECT 1 FROM mensaje_destinatarios md2 
          WHERE md2.mensaje_id = m.id AND md2.usuario_id = $1 AND md2.leido = true
        ) THEN true ELSE false END
      ) = ${leidoBool}`;
    }

    sqlMasivos += ' ORDER BY m.created_at DESC';

    const mensajesMasivos = await query(sqlMasivos, paramsMasivos);

    // Combinar y ordenar
    const todosMensajes = [...mensajesEspecificos.rows, ...mensajesMasivos.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(todosMensajes);
  } catch (error) {
    console.error('Error obteniendo mensajes recibidos:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Marcar mensaje como leído
router.put('/:id/leer', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    // Verificar si es mensaje específico
    const mensajeEspecifico = await query(
      'SELECT id FROM mensaje_destinatarios WHERE mensaje_id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );

    if (mensajeEspecifico.rows.length > 0) {
      await query(
        'UPDATE mensaje_destinatarios SET leido = true, leido_at = CURRENT_TIMESTAMP WHERE mensaje_id = $1 AND usuario_id = $2',
        [id, usuarioId]
      );
    } else {
      // Para mensajes masivos, crear registro de lectura
      await query(
        `INSERT INTO mensaje_destinatarios (mensaje_id, usuario_id, leido, leido_at)
         VALUES ($1, $2, true, CURRENT_TIMESTAMP)
         ON CONFLICT (mensaje_id, usuario_id) DO UPDATE SET leido = true, leido_at = CURRENT_TIMESTAMP`,
        [id, usuarioId]
      );
    }

    res.json({ message: 'Mensaje marcado como leído' });
  } catch (error) {
    console.error('Error marcando mensaje como leído:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener detalles de un mensaje
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const mensaje = await query(
      `SELECT m.*, 
              u.nombre || ' ' || u.apellido as remitente_nombre,
              u.rol as remitente_rol,
              c.nombre as cancha_nombre
       FROM mensajes m
       JOIN usuarios u ON m.remitente_id = u.id
       LEFT JOIN canchas c ON m.cancha_id = c.id
       WHERE m.id = $1`,
      [id]
    );

    if (mensaje.rows.length === 0) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // Verificar acceso
    const mensajeData = mensaje.rows[0];

    // Si es remitente, puede verlo
    if (mensajeData.remitente_id === usuarioId) {
      // Obtener destinatarios si es específico
      if (mensajeData.tipo_envio === 'especificos' || mensajeData.tipo_envio === 'cancha') {
        const destinatarios = await query(
          `SELECT md.*, u.nombre, u.apellido, u.email
           FROM mensaje_destinatarios md
           JOIN usuarios u ON md.usuario_id = u.id
           WHERE md.mensaje_id = $1`,
          [id]
        );
        mensajeData.destinatarios = destinatarios.rows;
      }
      return res.json(mensajeData);
    }

    // Si es destinatario específico
    const esDestinatario = await query(
      'SELECT 1 FROM mensaje_destinatarios WHERE mensaje_id = $1 AND usuario_id = $2',
      [id, usuarioId]
    );

    if (esDestinatario.rows.length > 0) {
      return res.json(mensajeData);
    }

    // Si es mensaje masivo, verificar que el usuario pertenece al grupo
    if (mensajeData.tipo_envio === 'todos') {
      return res.json(mensajeData);
    }

    if (mensajeData.tipo_envio === 'usuarios' && req.user.rol === 'usuario') {
      return res.json(mensajeData);
    }

    if (mensajeData.tipo_envio === 'empleados' && req.user.rol === 'empleado') {
      return res.json(mensajeData);
    }

    res.status(403).json({ message: 'No tienes acceso a este mensaje' });
  } catch (error) {
    console.error('Error obteniendo mensaje:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;

