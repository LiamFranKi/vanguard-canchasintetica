const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const emailService = require('../services/email');

const router = express.Router();

// Obtener todos los usuarios (admin y empleado)
router.get('/', authenticate, authorize('admin', 'empleado'), async (req, res) => {
  try {
    const { rol, activo, search } = req.query;
    let sql = 'SELECT id, dni, nombre, apellido, email, telefono, rol, activo, avatar, fecha_registro FROM usuarios WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Empleados solo pueden ver usuarios con rol 'usuario'
    if (req.user.rol === 'empleado') {
      sql += ` AND rol = $${paramCount++}`;
      params.push('usuario');
    } else if (rol) {
      // Admin puede filtrar por cualquier rol
      sql += ` AND rol = $${paramCount++}`;
      params.push(rol);
    }

    if (activo !== undefined) {
      sql += ` AND activo = $${paramCount++}`;
      params.push(activo === 'true');
    }

    if (search) {
      sql += ` AND (dni ILIKE $${paramCount} OR nombre ILIKE $${paramCount} OR apellido ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    sql += ' ORDER BY fecha_registro DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener usuario por ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Usuario solo puede ver su propio perfil, admin/empleado pueden ver cualquiera
    if (req.user.rol === 'usuario' && parseInt(id) !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await query(
      'SELECT id, dni, nombre, apellido, email, telefono, rol, activo, avatar, fecha_registro FROM usuarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear usuario (admin y empleado)
router.post('/', authenticate, authorize('admin', 'empleado'), [
  body('dni').notEmpty().withMessage('DNI es requerido'),
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('apellido').notEmpty().withMessage('Apellido es requerido'),
  body('rol').custom((value, { req }) => {
    // Admin puede crear cualquier rol
    if (req.user.rol === 'admin') {
      if (!['admin', 'empleado', 'usuario'].includes(value)) {
        throw new Error('Rol inválido');
      }
    } else {
      // Empleado solo puede crear usuarios
      if (value !== 'usuario') {
        throw new Error('Los empleados solo pueden crear usuarios');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dni, nombre, apellido, email, telefono, rol } = req.body;

    // Verificar que el DNI no exista
    const checkUser = await query('SELECT id FROM usuarios WHERE dni = $1', [dni]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'El DNI ya está registrado' });
    }

    // Determinar el rol según el usuario que crea
    let rolFinal = rol || 'usuario';
    if (req.user.rol === 'empleado') {
      // Los empleados SOLO pueden crear usuarios con rol 'usuario'
      rolFinal = 'usuario';
    } else if (req.user.rol === 'admin') {
      // Los admins pueden crear cualquier rol, pero si no se especifica, es 'usuario'
      rolFinal = rol || 'usuario';
    }

    // La contraseña inicial es el DNI
    const hashedPassword = await bcrypt.hash(dni, 10);

    const result = await query(
      `INSERT INTO usuarios (dni, nombre, apellido, email, telefono, password, rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, dni, nombre, apellido, email, telefono, rol, activo`,
      [dni, nombre, apellido, email || null, telefono || null, hashedPassword, rolFinal]
    );

    const newUser = result.rows[0];

    // Enviar correo de bienvenida si tiene email (asíncrono, no bloquea la respuesta)
    if (email) {
      emailService.sendWelcomeEmail(email, nombre, dni).catch(emailError => {
        console.error('Error enviando correo de bienvenida:', emailError);
      });
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar usuario
router.put('/:id', authenticate, [
  body('nombre').optional().notEmpty(),
  body('apellido').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nombre, apellido, email, telefono, activo, rol } = req.body;

    // Usuario solo puede actualizar su propio perfil (sin activo ni rol), admin puede actualizar cualquiera
    if (req.user.rol === 'usuario' && parseInt(id) !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Solo admin puede cambiar el rol
    if (rol && req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'Solo los administradores pueden cambiar el rol' });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (nombre) {
      updates.push(`nombre = $${paramCount++}`);
      params.push(nombre);
    }
    if (apellido) {
      updates.push(`apellido = $${paramCount++}`);
      params.push(apellido);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      params.push(email);
    }
    if (telefono !== undefined) {
      updates.push(`telefono = $${paramCount++}`);
      params.push(telefono);
    }
    if (activo !== undefined && req.user.rol === 'admin') {
      updates.push(`activo = $${paramCount++}`);
      params.push(activo);
    }
    if (rol && req.user.rol === 'admin') {
      updates.push(`rol = $${paramCount++}`);
      params.push(rol);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    params.push(id);
    const result = await query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, dni, nombre, apellido, email, telefono, rol, activo`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Eliminar usuario (solo admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    await query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;

