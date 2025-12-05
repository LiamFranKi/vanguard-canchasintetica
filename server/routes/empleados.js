const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const emailService = require('../services/email');

const router = express.Router();

// Obtener todos los empleados (solo admin)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, dni, nombre, apellido, email, telefono, activo, fecha_registro 
       FROM usuarios WHERE rol = 'empleado' ORDER BY fecha_registro DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear empleado (solo admin)
router.post('/', authenticate, authorize('admin'), [
  body('dni').notEmpty().withMessage('DNI es requerido'),
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('apellido').notEmpty().withMessage('Apellido es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dni, nombre, apellido, email, telefono } = req.body;

    // Verificar que el DNI no exista
    const checkUser = await query('SELECT id FROM usuarios WHERE dni = $1', [dni]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'El DNI ya está registrado' });
    }

    // La contraseña inicial es el DNI
    const hashedPassword = await bcrypt.hash(dni, 10);

    const result = await query(
      `INSERT INTO usuarios (dni, nombre, apellido, email, telefono, password, rol)
       VALUES ($1, $2, $3, $4, $5, $6, 'empleado')
       RETURNING id, dni, nombre, apellido, email, telefono, activo`,
      [dni, nombre, apellido, email || null, telefono || null, hashedPassword]
    );

    const newEmpleado = result.rows[0];

    // Enviar correo de bienvenida si tiene email
    if (email) {
      try {
        await emailService.sendWelcomeEmail(email, nombre, dni);
      } catch (emailError) {
        console.error('Error enviando correo de bienvenida:', emailError);
      }
    }

    res.status(201).json(newEmpleado);
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar empleado (solo admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, activo } = req.body;

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
    if (activo !== undefined) {
      updates.push(`activo = $${paramCount++}`);
      params.push(activo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    params.push(id);
    const result = await query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramCount} AND rol = 'empleado'
       RETURNING id, dni, nombre, apellido, email, telefono, activo`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Eliminar empleado (solo admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    await query('DELETE FROM usuarios WHERE id = $1 AND rol = $2', [id, 'empleado']);
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando empleado:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;


