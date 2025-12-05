const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const result = await query(
      'SELECT id, dni, nombre, apellido, email, rol, activo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ message: 'Usuario no válido o inactivo' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ message: 'No autorizado para esta acción' });
    }

    next();
  };
};

module.exports = { authenticate, authorize };


