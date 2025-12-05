const express = require('express');
const { query } = require('../database/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configurar multer para logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/config');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'logo' + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes'));
  }
});

// Obtener todas las configuraciones (público para algunos campos)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM configuraciones ORDER BY clave');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener configuración por clave
router.get('/:clave', async (req, res) => {
  try {
    const { clave } = req.params;
    const result = await query('SELECT * FROM configuraciones WHERE clave = $1', [clave]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Actualizar configuración (solo admin)
router.put('/:clave', authenticate, authorize('admin'), [
  body('valor').notEmpty().withMessage('Valor es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clave } = req.params;
    const { valor, descripcion } = req.body;

    const result = await query(
      `UPDATE configuraciones 
       SET valor = $1, ${descripcion ? 'descripcion = $2,' : ''} updated_at = CURRENT_TIMESTAMP 
       WHERE clave = $${descripcion ? '3' : '2'} 
       RETURNING *`,
      descripcion ? [valor, descripcion, clave] : [valor, clave]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Subir logo (solo admin)
router.post('/logo', authenticate, authorize('admin'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Archivo no proporcionado' });
    }

    const logoPath = `/uploads/config/${req.file.filename}`;

    // Actualizar o crear configuración de logo
    const result = await query(
      `INSERT INTO configuraciones (clave, valor, tipo, descripcion)
       VALUES ('logo', $1, 'imagen', 'Logo de la empresa')
       ON CONFLICT (clave) DO UPDATE SET valor = $1, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [logoPath]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error subiendo logo:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;


