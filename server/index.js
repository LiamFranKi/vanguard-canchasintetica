const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database/connection');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const canchaRoutes = require('./routes/canchas');
const reservaRoutes = require('./routes/reservas');
const pagoRoutes = require('./routes/pagos');
const configRoutes = require('./routes/config');
const empleadoRoutes = require('./routes/empleados');
const notificacionRoutes = require('./routes/notificaciones');
const { iniciarTareasProgramadas } = require('./services/scheduledTasks');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database connection
db.connect()
  .then(() => {
    console.log('✅ Base de datos conectada');
    // Iniciar tareas programadas después de conectar la base de datos
    iniciarTareasProgramadas();
  })
  .catch(err => console.error('❌ Error conectando a la base de datos:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/canchas', canchaRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/config', configRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/notificaciones', notificacionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

