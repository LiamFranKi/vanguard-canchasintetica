// Script para limpiar service workers
// Ejecutar en la consola del navegador si hay problemas

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(function(success) {
        if (success) {
          console.log('Service Worker desregistrado:', registration.scope);
        }
      });
    }
  });
  
  // Limpiar caché
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
        console.log('Caché eliminado:', name);
      }
    });
  }
  
  console.log('✅ Service Workers y caché limpiados. Recarga la página.');
}


