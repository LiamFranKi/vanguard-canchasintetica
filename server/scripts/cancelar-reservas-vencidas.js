/**
 * Script para ejecutar manualmente la cancelación de reservas vencidas
 * Uso: node scripts/cancelar-reservas-vencidas.js
 */

require('dotenv').config();
const db = require('../database/connection');
const { cancelarReservasVencidas } = require('../services/scheduledTasks');

// Asegurar conexión a la base de datos antes de ejecutar
db.connect()
  .then(() => {
    console.log('✅ Conectado a la base de datos\n');
  })
  .catch(err => {
    console.error('❌ Error conectando a la base de datos:', err);
    process.exit(1);
  });

(async () => {
  try {
    console.log('🚀 Iniciando cancelación manual de reservas vencidas...\n');
    const resultado = await cancelarReservasVencidas();
    console.log(`\n✅ Proceso completado. ${resultado.canceladas} reserva(s) cancelada(s).`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error ejecutando la tarea:', error);
    process.exit(1);
  }
})();

