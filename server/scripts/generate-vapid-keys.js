const webpush = require('web-push');

console.log('\n🔑 Generando VAPID Keys para Push Notifications...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID Keys generadas exitosamente!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 Copia estas claves a tu archivo .env:\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('🔵 VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('🔴 VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
  console.log('📧 VAPID_SUBJECT=mailto:admin@tudominio.com\n');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 Para el frontend (client/.env):\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('REACT_APP_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('⚠️  IMPORTANTE:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('1. Guarda estas claves en un lugar seguro');
  console.log('2. NUNCA compartas la VAPID_PRIVATE_KEY');
  console.log('3. La VAPID_PUBLIC_KEY va en el frontend (.env del client)');
  console.log('4. La VAPID_PRIVATE_KEY va en el backend (.env del server)');
  console.log('5. Cambia el VAPID_SUBJECT por tu email real\n');
  
  console.log('✅ Listo! Ahora configura estas variables en tus archivos .env\n');
  
} catch (error) {
  console.error('❌ Error generando VAPID keys:', error);
  process.exit(1);
}

