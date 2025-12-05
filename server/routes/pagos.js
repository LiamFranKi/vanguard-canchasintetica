const express = require('express');
const { query } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configurar multer para comprobantes
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

// Obtener pagos
router.get('/', authenticate, async (req, res) => {
  try {
    const { reserva_id, usuario_id, estado } = req.query;
    let sql = `
      SELECT p.*, 
             r.fecha, r.hora_inicio, r.hora_fin,
             c.nombre as cancha_nombre,
             u.nombre || ' ' || u.apellido as usuario_nombre
      FROM pagos p
      JOIN reservas r ON p.reserva_id = r.id
      JOIN canchas c ON r.cancha_id = c.id
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Usuario solo ve sus propios pagos
    if (req.user.rol === 'usuario') {
      sql += ` AND p.usuario_id = $${paramCount++}`;
      params.push(req.user.id);
    }

    // Empleado: solo pagos de canchas asignadas
    if (req.user.rol === 'empleado') {
      sql += ` AND EXISTS (
        SELECT 1 FROM cancha_personal cp
        WHERE cp.cancha_id = r.cancha_id AND cp.usuario_id = $${paramCount++}
      )`;
      params.push(req.user.id);
    }

    if (reserva_id) {
      sql += ` AND p.reserva_id = $${paramCount++}`;
      params.push(reserva_id);
    }

    if (usuario_id && (req.user.rol === 'admin' || req.user.rol === 'empleado')) {
      sql += ` AND p.usuario_id = $${paramCount++}`;
      params.push(usuario_id);
    }

    if (estado) {
      sql += ` AND p.estado = $${paramCount++}`;
      params.push(estado);
    }

    sql += ' ORDER BY p.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear pago (pago online o depósito)
router.post('/', authenticate, upload.single('comprobante'), [
  body('reserva_id').isInt().withMessage('Reserva es requerida'),
  body('metodo_pago').isIn(['online', 'deposito', 'efectivo', 'yape', 'transferencia']).withMessage('Método de pago inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reserva_id, metodo_pago, referencia_pago, usuario_id: usuario_id_param } = req.body;
    // Si es admin/empleado, puede especificar el usuario_id, sino usa el del token
    const usuario_id = (req.user.rol === 'admin' || req.user.rol === 'empleado') && usuario_id_param 
      ? usuario_id_param 
      : req.user.id;

    // Verificar que la reserva existe
    const reserva = await query(
      'SELECT * FROM reservas WHERE id = $1',
      [reserva_id]
    );

    if (reserva.rows.length === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    // Si no es admin/empleado, verificar que la reserva pertenece al usuario
    if (req.user.rol === 'usuario' && reserva.rows[0].usuario_id !== usuario_id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Verificar si ya existe un pago confirmado
    const pagoExistente = await query(
      'SELECT * FROM pagos WHERE reserva_id = $1 AND estado = $2',
      [reserva_id, 'confirmado']
    );

    if (pagoExistente.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe un pago confirmado para esta reserva' });
    }

    const monto = reserva.rows[0].costo_total;
    const comprobante = req.file ? `/uploads/comprobantes/${req.file.filename}` : null;

    // Si es depósito o transferencia, requiere comprobante
    if ((metodo_pago === 'deposito' || metodo_pago === 'transferencia') && !comprobante) {
      return res.status(400).json({ message: 'Comprobante de pago es requerido' });
    }

    // Si es online o yape, requiere referencia
    if ((metodo_pago === 'online' || metodo_pago === 'yape') && !referencia_pago) {
      return res.status(400).json({ message: 'Referencia de pago es requerida' });
    }

    // Todos los pagos se confirman automáticamente al crearse
    const estado = 'confirmado';

    const fecha_pago = estado === 'confirmado' ? new Date() : null;

    const result = await query(
      `INSERT INTO pagos (reserva_id, usuario_id, monto, metodo_pago, estado, comprobante, referencia_pago, fecha_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [reserva_id, usuario_id, monto, metodo_pago, estado, comprobante, referencia_pago || null, fecha_pago]
    );

    // Si el pago está confirmado, actualizar estado de reserva
    if (estado === 'confirmado') {
      await query(
        'UPDATE reservas SET estado = $1 WHERE id = $2',
        ['completada', reserva_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando pago:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Confirmar pago (admin/empleado)
router.put('/:id/confirmar', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    const { id } = req.params;

    const pago = await query('SELECT * FROM pagos WHERE id = $1', [id]);
    if (pago.rows.length === 0) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const result = await query(
      `UPDATE pagos SET estado = 'confirmado', fecha_pago = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Actualizar estado de reserva
    await query(
      'UPDATE reservas SET estado = $1 WHERE id = $2',
      ['completada', result.rows[0].reserva_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error confirmando pago:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Rechazar pago (admin/empleado)
router.put('/:id/rechazar', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const result = await query(
      `UPDATE pagos SET estado = 'rechazado' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rechazando pago:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;

