const bcrypt = require('bcryptjs');
const { query } = require('./connection');

async function initAdmin() {
  try {
    // Verificar si ya existe un admin
    const existingAdmin = await query('SELECT id FROM usuarios WHERE rol = $1', ['admin']);
    
    if (existingAdmin.rows.length > 0) {
      console.log('Ya existe un administrador en el sistema');
      return;
    }

    // Crear admin por defecto
    // DNI: 12345678, Password: 12345678
    const dni = '12345678';
    const password = await bcrypt.hash(dni, 10);

    const result = await query(
      `INSERT INTO usuarios (dni, nombre, apellido, password, rol, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, dni, nombre`,
      [dni, 'Admin', 'Sistema', password, 'admin', true]
    );

    console.log('✅ Administrador creado exitosamente:');
    console.log(`   DNI: ${dni}`);
    console.log(`   Contraseña: ${dni}`);
    console.log(`   Usuario ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error('❌ Error creando administrador:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  require('dotenv').config();
  const db = require('./connection');
  
  db.connect()
    .then(() => {
      console.log('Conectado a la base de datos');
      return initAdmin();
    })
    .then(() => {
      console.log('Proceso completado');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = initAdmin;



