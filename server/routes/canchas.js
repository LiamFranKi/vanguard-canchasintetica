const express = require('express');
const { query } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/canchas');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cancha-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes'));
  }
});

// Obtener todas las canchas
// - Público (sin autenticación): solo canchas activas (para landing page)
// - Autenticado: según rol
//   - Admin: ve todas
//   - Empleado: solo canchas asignadas en cancha_personal
//   - Usuario: todas las activas/inactivas según filtro
router.get('/', async (req, res) => {
  try {
    const { activa } = req.query;
    let sql = 'SELECT c.* FROM canchas c WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Verificar si hay token válido
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userResult = await query(
          'SELECT id, rol, activo FROM usuarios WHERE id = $1',
          [decoded.userId]
        );
        
        if (userResult.rows.length > 0 && userResult.rows[0].activo) {
          user = userResult.rows[0];
        }
      } catch (jwtError) {
        // Token inválido, tratar como no autenticado
      }
    }

    // Si no está autenticado, solo mostrar canchas activas (para landing page)
    if (!user) {
      sql += ` AND c.activa = $${paramCount++}`;
      params.push(true);
      sql += ' ORDER BY nombre';
      const result = await query(sql, params);
      return res.json(result.rows);
    }

    // Usuario autenticado: aplicar filtros según rol
    if (activa !== undefined) {
      sql += ` AND c.activa = $${paramCount++}`;
      params.push(activa === 'true');
    }

    // Empleado: solo canchas asignadas
    if (user.rol === 'empleado') {
      sql += ` AND EXISTS (
        SELECT 1 FROM cancha_personal cp
        WHERE cp.cancha_id = c.id AND cp.usuario_id = $${paramCount++}
      )`;
      params.push(user.id);
    }

    sql += ' ORDER BY nombre';

    const result = await query(sql, params);
    
    // Para usuarios regulares, agregar contactos de empleados asignados
    if (user && user.rol === 'usuario') {
      const canchasConContactos = await Promise.all(
        result.rows.map(async (cancha) => {
          const contactosResult = await query(
            `SELECT u.telefono 
             FROM cancha_personal cp
             JOIN usuarios u ON cp.usuario_id = u.id
             WHERE cp.cancha_id = $1 AND u.telefono IS NOT NULL AND u.telefono != ''
             ORDER BY u.nombre, u.apellido`,
            [cancha.id]
          );
          
          const telefonos = contactosResult.rows.map(r => r.telefono).filter(t => t);
          cancha.contactos = telefonos.join(' - ');
          return cancha;
        })
      );
      return res.json(canchasConContactos);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo canchas:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener cancha por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM canchas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cancha no encontrada' });
    }

    // Obtener costos de la cancha
    const costos = await query(
      'SELECT * FROM costos WHERE cancha_id = $1 AND activo = true ORDER BY dia_semana, hora_inicio',
      [id]
    );

    res.json({
      ...result.rows[0],
      costos: costos.rows
    });
  } catch (error) {
    console.error('Error obteniendo cancha:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear cancha (solo admin)
router.post('/', authenticate, authorize('admin'), upload.single('imagen'), [
  body('nombre').notEmpty().withMessage('Nombre es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      nombre, 
      descripcion, 
      capacidad, 
      hora_inicio_atencion, 
      hora_fin_atencion,
      precio_30min_dia,
      precio_1hora_dia,
      precio_30min_noche,
      precio_1hora_noche,
      hora_limite_turno
    } = req.body;
    const imagen = req.file ? `/uploads/canchas/${req.file.filename}` : null;

    const result = await query(
      `INSERT INTO canchas (
        nombre, descripcion, capacidad, imagen, 
        hora_inicio_atencion, hora_fin_atencion,
        precio_30min_dia, precio_1hora_dia,
        precio_30min_noche, precio_1hora_noche,
        hora_limite_turno
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        nombre, 
        descripcion || null, 
        capacidad || 10, 
        imagen,
        hora_inicio_atencion || '08:00',
        hora_fin_atencion || '23:00',
        precio_30min_dia || 25.00,
        precio_1hora_dia || 50.00,
        precio_30min_noche || 35.00,
        precio_1hora_noche || 70.00,
        hora_limite_turno || '18:00'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando cancha:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar cancha (solo admin)
router.put('/:id', authenticate, authorize('admin'), upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      descripcion, 
      capacidad, 
      activa, 
      hora_inicio_atencion, 
      hora_fin_atencion, 
      precio_30min, 
      precio_1hora,
      precio_30min_dia,
      precio_1hora_dia,
      precio_30min_noche,
      precio_1hora_noche,
      hora_limite_turno
    } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (nombre) {
      updates.push(`nombre = $${paramCount++}`);
      params.push(nombre);
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramCount++}`);
      params.push(descripcion);
    }
    if (capacidad) {
      updates.push(`capacidad = $${paramCount++}`);
      params.push(capacidad);
    }
    if (activa !== undefined) {
      updates.push(`activa = $${paramCount++}`);
      params.push(activa);
    }
    if (hora_inicio_atencion) {
      updates.push(`hora_inicio_atencion = $${paramCount++}`);
      params.push(hora_inicio_atencion);
    }
    if (hora_fin_atencion) {
      updates.push(`hora_fin_atencion = $${paramCount++}`);
      params.push(hora_fin_atencion);
    }
    // Mantener compatibilidad con campos antiguos
    if (precio_30min !== undefined) {
      updates.push(`precio_30min = $${paramCount++}`);
      params.push(precio_30min);
    }
    if (precio_1hora !== undefined) {
      updates.push(`precio_1hora = $${paramCount++}`);
      params.push(precio_1hora);
    }
    // Nuevos campos de precios por turno
    if (precio_30min_dia !== undefined) {
      updates.push(`precio_30min_dia = $${paramCount++}`);
      params.push(precio_30min_dia);
    }
    if (precio_1hora_dia !== undefined) {
      updates.push(`precio_1hora_dia = $${paramCount++}`);
      params.push(precio_1hora_dia);
    }
    if (precio_30min_noche !== undefined) {
      updates.push(`precio_30min_noche = $${paramCount++}`);
      params.push(precio_30min_noche);
    }
    if (precio_1hora_noche !== undefined) {
      updates.push(`precio_1hora_noche = $${paramCount++}`);
      params.push(precio_1hora_noche);
    }
    if (hora_limite_turno) {
      updates.push(`hora_limite_turno = $${paramCount++}`);
      params.push(hora_limite_turno);
    }
    if (req.file) {
      updates.push(`imagen = $${paramCount++}`);
      params.push(`/uploads/canchas/${req.file.filename}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    params.push(id);
    const result = await query(
      `UPDATE canchas SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando cancha:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Eliminar cancha (solo admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM canchas WHERE id = $1', [id]);
    res.json({ message: 'Cancha eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando cancha:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Gestión de costos
router.post('/:id/costos', authenticate, authorize('admin'), [
  body('hora_inicio').notEmpty(),
  body('hora_fin').notEmpty(),
  body('costo').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { hora_inicio, hora_fin, costo, dia_semana } = req.body;

    const result = await query(
      `INSERT INTO costos (cancha_id, hora_inicio, hora_fin, costo, dia_semana)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, hora_inicio, hora_fin, costo, dia_semana || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando costo:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

router.put('/costos/:costoId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { costoId } = req.params;
    const { hora_inicio, hora_fin, costo, dia_semana, activo } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (hora_inicio) {
      updates.push(`hora_inicio = $${paramCount++}`);
      params.push(hora_inicio);
    }
    if (hora_fin) {
      updates.push(`hora_fin = $${paramCount++}`);
      params.push(hora_fin);
    }
    if (costo) {
      updates.push(`costo = $${paramCount++}`);
      params.push(costo);
    }
    if (dia_semana !== undefined) {
      updates.push(`dia_semana = $${paramCount++}`);
      params.push(dia_semana);
    }
    if (activo !== undefined) {
      updates.push(`activo = $${paramCount++}`);
      params.push(activo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    params.push(costoId);
    const result = await query(
      `UPDATE costos SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando costo:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

router.delete('/costos/:costoId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { costoId } = req.params;
    await query('DELETE FROM costos WHERE id = $1', [costoId]);
    res.json({ message: 'Costo eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando costo:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener personal asignado a una cancha (admin/empleado)
router.get('/:id/personal', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.id, u.dni, u.nombre, u.apellido, u.email
       FROM cancha_personal cp
       JOIN usuarios u ON cp.usuario_id = u.id
       WHERE cp.cancha_id = $1
       ORDER BY u.nombre, u.apellido`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo personal de cancha:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar personal asignado a una cancha (solo admin)
router.put('/:id/personal', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { empleados } = req.body; // array de IDs de usuarios (empleados)

    if (!Array.isArray(empleados)) {
      return res.status(400).json({ message: 'La lista de empleados debe ser un arreglo' });
    }

    // Transacción simple: borrar asignaciones actuales y volver a insertarlas
    await query('BEGIN');
    await query('DELETE FROM cancha_personal WHERE cancha_id = $1', [id]);

    if (empleados.length > 0) {
      const values = [];
      const params = [id];
      let paramIndex = 2;

      empleados.forEach((empId) => {
        values.push(`($1, $${paramIndex++})`);
        params.push(empId);
      });

      const sql = `INSERT INTO cancha_personal (cancha_id, usuario_id) VALUES ${values.join(',')}`;
      await query(sql, params);
    }

    await query('COMMIT');

    res.json({ message: 'Personal de cancha actualizado correctamente' });
  } catch (error) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error actualizando personal de cancha:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;

