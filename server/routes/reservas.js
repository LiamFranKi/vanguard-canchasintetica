const express = require('express');
const { query, transaction } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
// Configurar zona horaria para moment.js (usar local con zona horaria del sistema configurada)
const TIMEZONE = process.env.TIMEZONE || 'America/Lima';
const emailService = require('../services/email');
const notificationService = require('../services/notifications');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper para obtener la fecha actual en la zona horaria correcta
const getFechaActual = () => {
  return moment().local().format('YYYY-MM-DD');
};

const router = express.Router();

// Configurar multer para comprobantes de pago
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/comprobantes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'comprobante-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes o PDF'));
  }
});

// Obtener reservas
router.get('/', authenticate, async (req, res) => {
  try {
    const { cancha_id, fecha, fecha_inicio, fecha_fin, usuario_id, estado } = req.query;
    let sql = `
      SELECT r.*, 
             c.nombre as cancha_nombre,
             c.precio_30min,
             c.precio_1hora,
             c.precio_30min_dia,
             c.precio_1hora_dia,
             c.precio_30min_noche,
             c.precio_1hora_noche,
             c.hora_limite_turno,
             c.hora_inicio_atencion,
             c.hora_fin_atencion,
             u.nombre || ' ' || u.apellido as usuario_nombre,
             u.dni as usuario_dni,
             e.nombre || ' ' || e.apellido as empleado_nombre,
             p.id as pago_id,
             p.estado as pago_estado,
             p.metodo_pago,
             p.comprobante,
             p.referencia_pago,
             p.fecha_pago
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN usuarios u ON r.usuario_id = u.id
      LEFT JOIN usuarios e ON r.empleado_id = e.id
      LEFT JOIN LATERAL (
        SELECT id, estado, metodo_pago, comprobante, referencia_pago, fecha_pago
        FROM pagos
        WHERE reserva_id = r.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON true
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Usuario solo ve sus propias reservas
    if (req.user.rol === 'usuario') {
      sql += ` AND r.usuario_id = $${paramCount++}`;
      params.push(req.user.id);
    }

    // Empleado: solo reservas de canchas asignadas
    if (req.user.rol === 'empleado') {
      sql += ` AND EXISTS (
        SELECT 1 FROM cancha_personal cp
        WHERE cp.cancha_id = r.cancha_id AND cp.usuario_id = $${paramCount++}
      )`;
      params.push(req.user.id);
    }

    if (cancha_id) {
      sql += ` AND r.cancha_id = $${paramCount++}`;
      params.push(cancha_id);
    }

    if (fecha) {
      sql += ` AND r.fecha = $${paramCount++}`;
      params.push(fecha);
    }

    if (fecha_inicio) {
      sql += ` AND r.fecha >= $${paramCount++}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      sql += ` AND r.fecha <= $${paramCount++}`;
      params.push(fecha_fin);
    }

    if (usuario_id && (req.user.rol === 'admin' || req.user.rol === 'empleado')) {
      sql += ` AND r.usuario_id = $${paramCount++}`;
      params.push(usuario_id);
    }

    if (estado) {
      sql += ` AND r.estado = $${paramCount++}`;
      params.push(estado);
    }

    sql += ' ORDER BY r.fecha DESC, r.hora_inicio DESC';

    const result = await query(sql, params);
    
    // Para usuarios regulares, agregar contactos de empleados asignados a cada cancha
    if (req.user.rol === 'usuario') {
      const reservasConContactos = await Promise.all(
        result.rows.map(async (reserva) => {
          const contactosResult = await query(
            `SELECT u.telefono 
             FROM cancha_personal cp
             JOIN usuarios u ON cp.usuario_id = u.id
             WHERE cp.cancha_id = $1 AND u.telefono IS NOT NULL AND u.telefono != ''
             ORDER BY u.nombre, u.apellido`,
            [reserva.cancha_id]
          );
          
          const telefonos = contactosResult.rows.map(r => r.telefono).filter(t => t);
          reserva.contactos = telefonos;
          return reserva;
        })
      );
      return res.json(reservasConContactos);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener disponibilidad de una cancha en una fecha
router.get('/disponibilidad/:canchaId', async (req, res) => {
  try {
    const { canchaId } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ message: 'Fecha es requerida' });
    }

    // Obtener reservas activas para esa fecha y cancha (pendientes y completadas)
    const reservas = await query(
      `SELECT hora_inicio, hora_fin FROM reservas 
       WHERE cancha_id = $1 AND fecha = $2 AND estado IN ('pendiente', 'confirmada', 'completada')`,
      [canchaId, fecha]
    );

    // Obtener costos/horarios disponibles de la cancha
    const diaSemana = moment(fecha).day();
    const costos = await query(
      `SELECT * FROM costos 
       WHERE cancha_id = $1 AND activo = true 
       AND (dia_semana IS NULL OR dia_semana = $2)
       ORDER BY hora_inicio`,
      [canchaId, diaSemana]
    );

    // Generar slots de hora disponibles
    const slots = [];
    costos.rows.forEach(costo => {
      const inicio = moment(costo.hora_inicio, 'HH:mm:ss');
      const fin = moment(costo.hora_fin, 'HH:mm:ss');
      
      // Crear slots de 1 hora
      let current = inicio.clone();
      while (current.isBefore(fin)) {
        const slotInicio = current.format('HH:mm');
        const slotFin = current.add(1, 'hour').format('HH:mm');
        
        // Verificar si está ocupado
        const ocupado = reservas.rows.some(r => {
          const rInicio = moment(r.hora_inicio, 'HH:mm:ss').format('HH:mm');
          const rFin = moment(r.hora_fin, 'HH:mm:ss').format('HH:mm');
          return (slotInicio >= rInicio && slotInicio < rFin) ||
                 (slotFin > rInicio && slotFin <= rFin) ||
                 (slotInicio <= rInicio && slotFin >= rFin);
        });

        slots.push({
          hora_inicio: slotInicio,
          hora_fin: slotFin,
          disponible: !ocupado,
          costo: parseFloat(costo.costo)
        });
      }
    });

    res.json({
      fecha,
      cancha_id: canchaId,
      slots
    });
  } catch (error) {
    console.error('Error obteniendo disponibilidad:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener horarios semanales de una cancha
router.get('/semanal/:canchaId', async (req, res) => {
  try {
    const { canchaId } = req.params;
    const { fecha_inicio } = req.query; // Fecha de inicio de la semana (lunes)

    const inicioSemana = fecha_inicio 
      ? moment(fecha_inicio).local().startOf('week').add(1, 'day') // Lunes
      : moment().local().startOf('week').add(1, 'day');

    const diasSemana = [];
    for (let i = 0; i < 7; i++) {
      const fecha = inicioSemana.clone().add(i, 'days');
      const diaSemana = fecha.day();
      
      // Obtener reservas del día
      const reservas = await query(
        `SELECT r.*, u.nombre || ' ' || u.apellido as usuario_nombre
         FROM reservas r
         JOIN usuarios u ON r.usuario_id = u.id
         WHERE r.cancha_id = $1 AND r.fecha = $2 AND r.estado IN ('pendiente', 'confirmada', 'completada')
         ORDER BY r.hora_inicio`,
        [canchaId, fecha.format('YYYY-MM-DD')]
      );

      // Obtener costos del día
      const costos = await query(
        `SELECT * FROM costos 
         WHERE cancha_id = $1 AND activo = true 
         AND (dia_semana IS NULL OR dia_semana = $2)
         ORDER BY hora_inicio`,
        [canchaId, diaSemana]
      );

      diasSemana.push({
        fecha: fecha.format('YYYY-MM-DD'),
        dia_nombre: fecha.format('dddd'),
        reservas: reservas.rows,
        horarios: costos.rows
      });
    }

    res.json({
      semana_inicio: inicioSemana.format('YYYY-MM-DD'),
      cancha_id: canchaId,
      dias: diasSemana
    });
  } catch (error) {
    console.error('Error obteniendo horarios semanales:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear reserva
router.post('/', authenticate, [
  body('cancha_id').isInt().withMessage('Cancha es requerida'),
  body('fecha').isISO8601().withMessage('Fecha inválida'),
  body('hora_inicio').notEmpty().withMessage('Hora inicio es requerida'),
  body('hora_fin').notEmpty().withMessage('Hora fin es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cancha_id, fecha, hora_inicio, hora_fin, notas, costo_total } = req.body;
    const usuario_id = req.user.rol === 'usuario' ? req.user.id : req.body.usuario_id;
    const empleado_id = (req.user.rol === 'admin' || req.user.rol === 'empleado') ? req.user.id : null;

    if (!usuario_id) {
      return res.status(400).json({ message: 'Usuario es requerido' });
    }

    // Empleado solo puede crear reservas en canchas asignadas
    if (req.user.rol === 'empleado') {
      const asignacion = await query(
        'SELECT 1 FROM cancha_personal WHERE cancha_id = $1 AND usuario_id = $2',
        [cancha_id, req.user.id]
      );
      if (asignacion.rows.length === 0) {
        return res.status(403).json({ message: 'No estás asignado a esta cancha' });
      }
    }

    // Usar transacción para prevenir condiciones de carrera (race conditions)
    // Protege contra reservas simultáneas cuando múltiples usuarios/clientes/empleados
    // intentan reservar la misma hora al mismo tiempo
    const result = await transaction(async (client) => {
      // Normalizar formato de horas (asegurar formato HH:mm:ss)
      const horaInicioNormalizada = hora_inicio.includes(':') && hora_inicio.split(':').length === 2 
        ? `${hora_inicio}:00` 
        : hora_inicio;
      const horaFinNormalizada = hora_fin.includes(':') && hora_fin.split(':').length === 2 
        ? `${hora_fin}:00` 
        : hora_fin;

      console.log('🔍 Verificando disponibilidad:', {
        cancha_id,
        fecha,
        hora_inicio_original: hora_inicio,
        hora_fin_original: hora_fin,
        hora_inicio_normalizada: horaInicioNormalizada,
        hora_fin_normalizada: horaFinNormalizada
      });

      // Bloquear filas existentes con SELECT FOR UPDATE para prevenir reservas simultáneas
      // Esto asegura que solo la primera solicitud pueda crear la reserva
      // La lógica verifica si hay solapamiento de horarios:
      // - Si la nueva reserva empieza dentro de una existente
      // - Si la nueva reserva termina dentro de una existente  
      // - Si la nueva reserva contiene completamente una existente
      const disponibilidad = await client.query(
        `SELECT id, hora_inicio, hora_fin, estado FROM reservas 
         WHERE cancha_id = $1 AND fecha = $2 
         AND estado IN ('pendiente', 'confirmada', 'completada')
         AND (
           (hora_inicio::time < $4::time AND hora_fin::time > $3::time)
         )
         FOR UPDATE`,
        [cancha_id, fecha, horaInicioNormalizada, horaFinNormalizada]
      );

      console.log('🔍 Resultados de disponibilidad:', {
        encontradas: disponibilidad.rows.length,
        reservas: disponibilidad.rows.map(r => ({
          id: r.id,
          hora_inicio: r.hora_inicio,
          hora_fin: r.hora_fin,
          estado: r.estado
        }))
      });

      if (disponibilidad.rows.length > 0) {
        throw new Error('El horario seleccionado no está disponible');
      }

      // Obtener datos de la cancha con bloqueo para consistencia
      const canchaResult = await client.query(
        `SELECT 
          precio_30min, precio_1hora,
          precio_30min_dia, precio_1hora_dia,
          precio_30min_noche, precio_1hora_noche,
          hora_limite_turno,
          hora_inicio_atencion, hora_fin_atencion 
        FROM canchas WHERE id = $1 FOR UPDATE`,
        [cancha_id]
      );

      if (canchaResult.rows.length === 0) {
        throw new Error('Cancha no encontrada');
      }

      const cancha = canchaResult.rows[0];
      
      // Calcular duración en minutos
      const inicio = moment(hora_inicio, 'HH:mm:ss');
      const fin = moment(hora_fin, 'HH:mm:ss');
      const duracionMinutos = fin.diff(inicio, 'minutes');

      // Determinar turno (día o noche) según la hora de inicio
      const horaLimite = moment(cancha.hora_limite_turno || '18:00', 'HH:mm:ss');
      const esTurnoNoche = inicio.isSameOrAfter(horaLimite);

      // Obtener precios según el turno
      let precio30min, precio1hora;
      if (esTurnoNoche) {
        precio30min = parseFloat(cancha.precio_30min_noche || cancha.precio_30min || 35);
        precio1hora = parseFloat(cancha.precio_1hora_noche || cancha.precio_1hora || 70);
      } else {
        precio30min = parseFloat(cancha.precio_30min_dia || cancha.precio_30min || 25);
        precio1hora = parseFloat(cancha.precio_1hora_dia || cancha.precio_1hora || 50);
      }

      // Calcular costo basado en la duración (o usar el costo_total si viene del frontend)
      let costoTotal = 0;
      
      // Si se proporciona un costo_total manualmente, usarlo; sino calcularlo
      if (costo_total !== undefined && costo_total !== null && costo_total !== '') {
        costoTotal = parseFloat(costo_total);
        if (isNaN(costoTotal) || costoTotal < 0) {
          throw new Error('El costo total debe ser un número válido mayor o igual a 0');
        }
      } else {
        // Calcular automáticamente según duración y turno
        if (duracionMinutos <= 30) {
          costoTotal = precio30min;
        } else if (duracionMinutos <= 60) {
          costoTotal = precio1hora;
        } else if (duracionMinutos <= 90) {
          costoTotal = precio1hora + precio30min;
        } else if (duracionMinutos <= 120) {
          costoTotal = precio1hora * 2;
        } else {
          // Para duraciones mayores, calcular proporcionalmente
          const horas = duracionMinutos / 60;
          costoTotal = precio1hora * horas;
        }
      }

      // Verificar que el horario esté dentro del rango de atención de la cancha
      const horaInicioAtencion = moment(cancha.hora_inicio_atencion || '08:00', 'HH:mm:ss');
      const horaFinAtencion = moment(cancha.hora_fin_atencion || '23:00', 'HH:mm:ss');
      
      if (inicio.isBefore(horaInicioAtencion) || fin.isAfter(horaFinAtencion)) {
        throw new Error(`El horario debe estar entre ${horaInicioAtencion.format('HH:mm')} y ${horaFinAtencion.format('HH:mm')}`);
      }

      // Crear reserva dentro de la transacción
      const insertResult = await client.query(
        `INSERT INTO reservas (cancha_id, usuario_id, empleado_id, fecha, hora_inicio, hora_fin, costo_total, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [cancha_id, usuario_id, empleado_id, fecha, hora_inicio, hora_fin, costoTotal, notas || null]
      );

      return insertResult;
    });

    const reserva = result.rows[0];

    // Responder inmediatamente sin esperar notificaciones/correos
    res.status(201).json({
      ...reserva,
      costo_total: parseFloat(reserva.costo_total)
    });

    // Enviar notificación y correo en segundo plano (asíncrono, no bloquea la respuesta)
    (async () => {
      try {
        const canchaData = await query('SELECT nombre FROM canchas WHERE id = $1', [cancha_id]);
        const usuarioData = await query('SELECT nombre, apellido, email FROM usuarios WHERE id = $1', [usuario_id]);
        const canchaNombre = canchaData.rows[0]?.nombre || '';

        // Enviar notificación al usuario
        await notificationService.createNotification(usuario_id, {
          titulo: 'Reserva Creada',
          mensaje: `Tu reserva para ${canchaNombre} el ${fecha} ha sido creada`,
          tipo: 'reserva',
          relacionado_tipo: 'reserva',
          relacionado_id: reserva.id
        });

        // Enviar correo al usuario si tiene email
        if (usuarioData.rows[0].email) {
          console.log('📧 Enviando correo de reserva confirmada al usuario:', usuarioData.rows[0].email);
          try {
            const emailEnviado = await emailService.sendReservationEmail(
              usuarioData.rows[0].email, 
              usuarioData.rows[0].nombre, 
              {
                cancha_nombre: canchaNombre,
                fecha,
                hora_inicio,
                hora_fin,
                costo_total: parseFloat(reserva.costo_total)
              }
            );
            if (emailEnviado) {
              console.log('✅ Correo de reserva confirmada enviado exitosamente al usuario');
            } else {
              console.warn('⚠️ No se pudo enviar el correo de reserva confirmada (transporter no configurado)');
            }
          } catch (emailError) {
            console.error('❌ Error enviando correo de reserva confirmada:', emailError);
          }
        } else {
          console.warn('⚠️ Usuario no tiene email configurado, no se enviará correo de reserva');
        }

        // Notificar al personal asignado a la cancha
        const personal = await query(
          `SELECT u.id, u.email, u.nombre, u.apellido
           FROM cancha_personal cp
           JOIN usuarios u ON cp.usuario_id = u.id
           WHERE cp.cancha_id = $1`,
          [cancha_id]
        );

        const reservaInfo = {
          cancha_nombre: canchaNombre,
          fecha,
          hora_inicio,
          hora_fin,
          costo_total: parseFloat(reserva.costo_total)
        };

        for (const emp of personal.rows) {
          await notificationService.createNotification(emp.id, {
            titulo: 'Nueva reserva',
            mensaje: `Se creó una nueva reserva en ${canchaNombre} para el ${fecha}`,
            tipo: 'reserva',
            relacionado_tipo: 'reserva',
            relacionado_id: reserva.id
          });

          if (emp.email) {
            console.log('📧 Enviando correo de nueva reserva al empleado:', emp.email);
            try {
              const usuarioNombreCompleto = `${usuarioData.rows[0].nombre} ${usuarioData.rows[0].apellido}`;
              const emailEnviado = await emailService.sendNewReservationNotificationToStaff(
                emp.email,
                `${emp.nombre} ${emp.apellido}`,
                reservaInfo,
                usuarioNombreCompleto
              );
              if (emailEnviado) {
                console.log('✅ Correo de nueva reserva enviado exitosamente al empleado');
              } else {
                console.warn('⚠️ No se pudo enviar el correo de nueva reserva (transporter no configurado)');
              }
            } catch (emailError) {
              console.error('❌ Error enviando correo de nueva reserva al personal:', emailError);
            }
          } else {
            console.warn(`⚠️ Empleado ${emp.nombre} ${emp.apellido} no tiene email configurado`);
          }
        }
      } catch (error) {
        console.error('Error en proceso en segundo plano:', error);
      }
    })();
  } catch (error) {
    console.error('Error creando reserva:', error);
    
    // Si el error es de disponibilidad, devolver un mensaje específico
    if (error.message === 'El horario seleccionado no está disponible') {
      return res.status(400).json({ message: error.message });
    }
    
    // Para otros errores de validación
    if (error.message && (error.message.includes('no encontrada') || error.message.includes('debe estar entre') || error.message.includes('debe ser un número'))) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar reserva (editar tiempo, notas, etc.)
router.put('/:id', authenticate, [
  body('hora_inicio').optional().notEmpty(),
  body('hora_fin').optional().notEmpty(),
  body('notas').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { hora_inicio, hora_fin, notas, costo_total } = req.body;

    // Obtener la reserva actual con datos de la cancha
    const reservaActual = await query(
      `SELECT r.*, 
        c.precio_30min, c.precio_1hora,
        c.precio_30min_dia, c.precio_1hora_dia,
        c.precio_30min_noche, c.precio_1hora_noche,
        c.hora_limite_turno,
        c.hora_inicio_atencion, c.hora_fin_atencion
       FROM reservas r
       JOIN canchas c ON r.cancha_id = c.id
       WHERE r.id = $1`,
      [id]
    );

    if (reservaActual.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const reserva = reservaActual.rows[0];

    // Verificar permisos: usuario solo puede editar sus propias reservas pendientes
    if (req.user.rol === 'usuario' && reserva.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Solo se pueden editar reservas pendientes, confirmadas o completadas
    if (!['pendiente', 'confirmada', 'completada'].includes(reserva.estado)) {
      return res.status(400).json({ message: 'Solo se pueden editar reservas pendientes, confirmadas o completadas' });
    }

    let nuevaHoraInicio = hora_inicio || reserva.hora_inicio;
    let nuevaHoraFin = hora_fin || reserva.hora_fin;
    const nuevasNotas = notas !== undefined ? notas : reserva.notas;

    // Si se proporciona costo_total manualmente, usarlo; sino recalcular si cambió el tiempo
    let nuevoCostoTotal = reserva.costo_total;
    
    console.log('📝 Backend recibiendo edición de reserva:', {
      costo_total_recibido: costo_total,
      costo_total_type: typeof costo_total,
      hora_inicio,
      hora_fin
    });
    
    if (costo_total !== undefined && costo_total !== null && costo_total !== '') {
      // Usar el costo manual proporcionado
      nuevoCostoTotal = parseFloat(costo_total);
      if (isNaN(nuevoCostoTotal) || nuevoCostoTotal < 0) {
        return res.status(400).json({ message: 'El costo total debe ser un número válido mayor o igual a 0' });
      }
      console.log('✅ Usando costo manual:', nuevoCostoTotal);
    } else if (hora_inicio || hora_fin) {
      // Recalcular automáticamente si cambió el tiempo
      const inicio = moment(nuevaHoraInicio, 'HH:mm:ss');
      const fin = moment(nuevaHoraFin, 'HH:mm:ss');
      const duracionMinutos = fin.diff(inicio, 'minutes');

      if (duracionMinutos <= 0) {
        return res.status(400).json({ message: 'La hora fin debe ser mayor que la hora inicio' });
      }

      // Determinar turno según la nueva hora de inicio
      const horaLimite = moment(reserva.hora_limite_turno || '18:00', 'HH:mm:ss');
      const esTurnoNoche = inicio.isSameOrAfter(horaLimite);

      // Obtener precios según el turno
      let precio30min, precio1hora;
      if (esTurnoNoche) {
        precio30min = parseFloat(reserva.precio_30min_noche || reserva.precio_30min || 35);
        precio1hora = parseFloat(reserva.precio_1hora_noche || reserva.precio_1hora || 70);
      } else {
        precio30min = parseFloat(reserva.precio_30min_dia || reserva.precio_30min || 25);
        precio1hora = parseFloat(reserva.precio_1hora_dia || reserva.precio_1hora || 50);
      }

      // Calcular nuevo costo
      if (duracionMinutos <= 30) {
        nuevoCostoTotal = precio30min;
      } else if (duracionMinutos <= 60) {
        nuevoCostoTotal = precio1hora;
      } else if (duracionMinutos <= 90) {
        nuevoCostoTotal = precio1hora + precio30min;
      } else if (duracionMinutos <= 120) {
        nuevoCostoTotal = precio1hora * 2;
      } else {
        const horas = duracionMinutos / 60;
        nuevoCostoTotal = precio1hora * horas;
      }
    }

    // Si cambió el horario, validar horario y disponibilidad (sin importar si cambió el costo)
    if (hora_inicio || hora_fin) {
      const inicio = moment(nuevaHoraInicio, 'HH:mm:ss');
      const fin = moment(nuevaHoraFin, 'HH:mm:ss');
      
      // Verificar que el nuevo horario esté dentro del rango de atención
      const horaInicioAtencion = moment(reserva.hora_inicio_atencion || '08:00', 'HH:mm:ss');
      const horaFinAtencion = moment(reserva.hora_fin_atencion || '23:00', 'HH:mm:ss');
      
      if (inicio.isBefore(horaInicioAtencion) || fin.isAfter(horaFinAtencion)) {
        return res.status(400).json({ 
          message: `El horario debe estar entre ${horaInicioAtencion.format('HH:mm')} y ${horaFinAtencion.format('HH:mm')}` 
        });
      }

      // Verificar disponibilidad del nuevo horario (excluyendo la reserva actual)
      const disponibilidad = await query(
        `SELECT COUNT(*) as count FROM reservas 
         WHERE cancha_id = $1 AND fecha = $2 
         AND id != $3
         AND estado IN ('pendiente', 'confirmada', 'completada')
         AND (
           (hora_inicio <= $4 AND hora_fin > $4) OR
           (hora_inicio < $5 AND hora_fin >= $5) OR
           (hora_inicio >= $4 AND hora_fin <= $5)
         )`,
        [reserva.cancha_id, reserva.fecha, id, nuevaHoraInicio, nuevaHoraFin]
      );

      if (parseInt(disponibilidad.rows[0].count) > 0) {
        return res.status(400).json({ message: 'El nuevo horario seleccionado no está disponible' });
      }
    }

    // Actualizar la reserva
    const result = await query(
      `UPDATE reservas 
       SET hora_inicio = $1, hora_fin = $2, costo_total = $3, notas = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [nuevaHoraInicio, nuevaHoraFin, nuevoCostoTotal, nuevasNotas, id]
    );

    // Obtener datos completos para la respuesta
    const reservaActualizada = await query(
      `SELECT r.*, 
              c.nombre as cancha_nombre,
              c.precio_30min,
              c.precio_1hora,
              c.precio_30min_dia,
              c.precio_1hora_dia,
              c.precio_30min_noche,
              c.precio_1hora_noche,
              c.hora_limite_turno,
              u.nombre || ' ' || u.apellido as usuario_nombre
       FROM reservas r
       JOIN canchas c ON r.cancha_id = c.id
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    res.json(reservaActualizada.rows[0]);
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar estado de reserva
router.put('/:id/estado', authenticate, authorize('admin', 'empleado'), [
  body('estado').isIn(['pendiente', 'confirmada', 'cancelada', 'completada'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { estado } = req.body;

    const result = await query(
      `UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Cancelar reserva
router.put('/:id/cancelar', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la reserva pertenece al usuario o es admin/empleado
    const reservaCheck = await query(
      `SELECT r.*, c.nombre as cancha_nombre, u.email, u.nombre as usuario_nombre
       FROM reservas r
       JOIN canchas c ON r.cancha_id = c.id
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.id = $1`,
      [id]
    );
    if (reservaCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const reservaData = reservaCheck.rows[0];

    if (req.user.rol === 'usuario' && reservaData.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await query(
      `UPDATE reservas SET estado = 'cancelada' WHERE id = $1 RETURNING *`,
      [id]
    );

    const reserva = { ...reservaData, ...result.rows[0] };

    res.json(reserva);

    // Notificación y correo en segundo plano (usuario + personal asignado)
    (async () => {
      try {
        // Notificación y correo al usuario
        await notificationService.createNotification(reserva.usuario_id, {
          titulo: 'Reserva Cancelada',
          mensaje: `Tu reserva para ${reserva.cancha_nombre} el ${reserva.fecha} ha sido cancelada`,
          tipo: 'reserva',
          relacionado_tipo: 'reserva',
          relacionado_id: reserva.id
        });

        if (reserva.email) {
          emailService.sendReservationCancelledEmail(
            reserva.email,
            reserva.usuario_nombre || '',
            reserva
          ).catch(err => console.error('Error enviando correo de reserva cancelada:', err));
        }

        // Notificación/correo al personal asignado a la cancha
        const personal = await query(
          `SELECT u.id, u.email, u.nombre, u.apellido
           FROM cancha_personal cp
           JOIN usuarios u ON cp.usuario_id = u.id
           WHERE cp.cancha_id = $1`,
          [reserva.cancha_id]
        );

        for (const emp of personal.rows) {
          await notificationService.createNotification(emp.id, {
            titulo: 'Reserva Cancelada',
            mensaje: `Se canceló una reserva para ${reserva.cancha_nombre} el ${reserva.fecha}`,
            tipo: 'reserva',
            relacionado_tipo: 'reserva',
            relacionado_id: reserva.id
          });

          if (emp.email) {
            emailService.sendReservationCancelledEmail(
              emp.email,
              emp.nombre,
              reserva
            ).catch(err => console.error('Error enviando correo a personal (reserva cancelada):', err));
          }
        }
      } catch (e) {
        console.error('Error en proceso de notificación de cancelación:', e);
      }
    })();
  } catch (error) {
    console.error('Error cancelando reserva:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear pago desde reserva (unificado)
router.post('/:id/pago', authenticate, upload.single('comprobante'), [
  body('metodo_pago').isIn(['online', 'deposito', 'efectivo', 'yape', 'transferencia']).withMessage('Método de pago inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { metodo_pago, referencia_pago } = req.body;
    const usuario_id = req.user.id;

    // Obtener la reserva
    const reserva = await query('SELECT * FROM reservas WHERE id = $1', [id]);
    if (reserva.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const reservaData = reserva.rows[0];

    // Si no es admin/empleado, verificar que la reserva pertenece al usuario
    if (req.user.rol === 'usuario' && reservaData.usuario_id !== usuario_id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Verificar si ya existe un pago confirmado
    const pagoExistente = await query(
      'SELECT * FROM pagos WHERE reserva_id = $1 AND estado = $2',
      [id, 'confirmado']
    );

    if (pagoExistente.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un pago confirmado para esta reserva' });
    }

    const monto = reservaData.costo_total;
    const comprobante = req.file ? `/uploads/comprobantes/${req.file.filename}` : null;

    // Validaciones según método de pago
    if ((metodo_pago === 'yape' || metodo_pago === 'transferencia') && !comprobante) {
      return res.status(400).json({ message: 'Comprobante de pago es requerido para Yape y Transferencia' });
    }

    // Todos los pagos (Efectivo, Yape, Transferencia) se confirman automáticamente
    const estado = 'confirmado';

    const fecha_pago = estado === 'confirmado' ? new Date() : null;

    // Crear el pago
    const result = await query(
      `INSERT INTO pagos (reserva_id, usuario_id, monto, metodo_pago, estado, comprobante, referencia_pago, fecha_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, reservaData.usuario_id, monto, metodo_pago, estado, comprobante, referencia_pago || null, fecha_pago]
    );

    const pago = result.rows[0];

    // Si el pago está confirmado, actualizar estado de reserva
    if (estado === 'confirmado') {
      await query(
        'UPDATE reservas SET estado = $1 WHERE id = $2',
        ['completada', id]
      );
    }

    res.status(201).json(pago);

    // Notificaciones y correos en segundo plano (usuario + personal)
    if (estado === 'confirmado') {
      (async () => {
        try {
          // Obtener datos de cancha y usuario
          const canchaData = await query('SELECT nombre FROM canchas WHERE id = $1', [reservaData.cancha_id]);
          const usuarioData = await query('SELECT nombre, apellido, email FROM usuarios WHERE id = $1', [reservaData.usuario_id]);

          const reservaInfo = {
            ...reservaData,
            cancha_nombre: canchaData.rows[0]?.nombre || '',
            fecha: reservaData.fecha,
            hora_inicio: reservaData.hora_inicio,
            hora_fin: reservaData.hora_fin
          };

          // Notificación y correo al usuario
          await notificationService.createNotification(reservaData.usuario_id, {
            titulo: 'Pago registrado',
            mensaje: `Tu pago para la reserva en ${reservaInfo.cancha_nombre} el ${reservaInfo.fecha} ha sido registrado correctamente`,
            tipo: 'pago',
            relacionado_tipo: 'reserva',
            relacionado_id: reservaData.id
          });

          if (usuarioData.rows[0]?.email) {
            emailService.sendPaymentEmail(
              usuarioData.rows[0].email,
              usuarioData.rows[0].nombre,
              reservaInfo,
              pago
            ).catch(err => console.error('Error enviando correo de pago al usuario:', err));
          }

          // Notificación/correo al personal asignado a la cancha
          const personal = await query(
            `SELECT u.id, u.email, u.nombre, u.apellido
             FROM cancha_personal cp
             JOIN usuarios u ON cp.usuario_id = u.id
             WHERE cp.cancha_id = $1`,
            [reservaData.cancha_id]
          );

          for (const emp of personal.rows) {
            await notificationService.createNotification(emp.id, {
              titulo: 'Pago registrado',
              mensaje: `Se registró un pago para la reserva en ${reservaInfo.cancha_nombre} el ${reservaInfo.fecha}`,
              tipo: 'pago',
              relacionado_tipo: 'reserva',
              relacionado_id: reservaData.id
            });

            if (emp.email) {
              emailService.sendPaymentEmail(
                emp.email,
                emp.nombre,
                reservaInfo,
                pago
              ).catch(err => console.error('Error enviando correo de pago al personal:', err));
            }
          }
        } catch (e) {
          console.error('Error en proceso de notificación de pago:', e);
        }
      })();
    }
  } catch (error) {
    console.error('Error creando pago desde reserva:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Confirmar pago de una reserva (admin/empleado)
router.put('/:id/pago/confirmar', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el pago pendiente de la reserva
    const pago = await query(
      'SELECT * FROM pagos WHERE reserva_id = $1 AND estado = $2 ORDER BY created_at DESC LIMIT 1',
      [id, 'pendiente']
    );

    if (pago.rows.length === 0) {
      return res.status(404).json({ message: 'No hay pago pendiente para esta reserva' });
    }

    const pagoId = pago.rows[0].id;

    // Obtener datos de la reserva antes de actualizar
    const reservaData = await query(
      `SELECT r.*, c.nombre as cancha_nombre 
       FROM reservas r 
       JOIN canchas c ON r.cancha_id = c.id 
       WHERE r.id = $1`,
      [id]
    );

    if (reservaData.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Confirmar el pago
    const result = await query(
      `UPDATE pagos SET estado = 'confirmado', fecha_pago = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [pagoId]
    );

    // Actualizar estado de reserva
    await query(
      'UPDATE reservas SET estado = $1 WHERE id = $2',
      ['completada', id]
    );

    res.json(result.rows[0]);

    // Enviar correo de confirmación de pago al usuario en segundo plano
    (async () => {
      try {
        const usuarioData = await query('SELECT nombre, apellido, email FROM usuarios WHERE id = $1', [reservaData.rows[0].usuario_id]);
        const reservaInfo = {
          ...reservaData.rows[0],
          cancha_nombre: reservaData.rows[0].cancha_nombre,
          fecha: reservaData.rows[0].fecha,
          hora_inicio: reservaData.rows[0].hora_inicio,
          hora_fin: reservaData.rows[0].hora_fin
        };
        const pagoConfirmado = result.rows[0];

        // Notificación y correo al usuario
        await notificationService.createNotification(reservaData.rows[0].usuario_id, {
          titulo: 'Pago confirmado',
          mensaje: `Tu pago para la reserva en ${reservaInfo.cancha_nombre} el ${reservaInfo.fecha} ha sido confirmado`,
          tipo: 'pago',
          relacionado_tipo: 'reserva',
          relacionado_id: id
        });

        if (usuarioData.rows[0]?.email) {
          emailService.sendPaymentEmail(
            usuarioData.rows[0].email,
            usuarioData.rows[0].nombre,
            reservaInfo,
            pagoConfirmado
          ).catch(err => console.error('Error enviando correo de pago confirmado al usuario:', err));
        }
      } catch (e) {
        console.error('Error en proceso de notificación de pago confirmado:', e);
      }
    })();
  } catch (error) {
    console.error('Error confirmando pago:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Eliminar reserva (solo canceladas) - solo admin
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la reserva exista y esté cancelada
    const reserva = await query('SELECT * FROM reservas WHERE id = $1', [id]);
    if (reserva.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    if (reserva.rows[0].estado !== 'cancelada') {
      return res.status(400).json({ message: 'Solo se pueden eliminar reservas canceladas' });
    }

    // Eliminar pagos asociados
    await query('DELETE FROM pagos WHERE reserva_id = $1', [id]);

    // Eliminar reserva
    await query('DELETE FROM reservas WHERE id = $1', [id]);

    return res.json({ message: 'Reserva eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Cancelar reservas vencidas sin pago (endpoint para ejecutar periódicamente o manualmente)
router.post('/cancelar-vencidas', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    // Obtener días máximos de configuración
    const config = await query(
      "SELECT valor FROM configuraciones WHERE clave = 'dias_max_pago'"
    );
    const diasMax = parseInt(config.rows[0]?.valor || 3);

    // Buscar reservas pendientes que no tienen pago confirmado y han pasado los días máximos
    const fechaLimite = moment().local().subtract(diasMax, 'days').format('YYYY-MM-DD');
    
    const reservasVencidas = await query(
      `SELECT r.id, r.usuario_id, r.cancha_id, r.fecha, r.hora_inicio
       FROM reservas r
       LEFT JOIN pagos p ON r.id = p.reserva_id AND p.estado = 'confirmado'
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
    }

    res.json({ 
      message: `Se cancelaron ${canceladas} reservas vencidas sin pago`,
      canceladas 
    });
  } catch (error) {
    console.error('Error cancelando reservas vencidas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;

