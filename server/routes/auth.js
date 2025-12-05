const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Login
router.post('/login', [
  body('dni').notEmpty().withMessage('DNI es requerido'),
  body('password').notEmpty().withMessage('Contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dni, password } = req.body;

    const result = await query(
      'SELECT * FROM usuarios WHERE dni = $1',
      [dni]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Cambiar contraseña
router.post('/cambiar-password', authenticate, [
  body('password_actual').notEmpty().withMessage('Contraseña actual es requerida'),
  body('password_nueva').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password_actual, password_nueva } = req.body;
    const userId = req.user.id;

    const result = await query('SELECT password FROM usuarios WHERE id = $1', [userId]);
    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password_actual, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(password_nueva, 10);
    await query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Verificar token
router.get('/verify', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;


