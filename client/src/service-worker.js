/* eslint-disable no-restricted-globals, no-undef */
/* global importScripts, workbox */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Precache files
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Navigation route
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
workbox.routing.registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') {
      return false;
    }
    if (url.pathname.startsWith('/_')) {
      return false;
    }
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }
    return true;
  },
  workbox.precaching.createHandlerBoundToURL('/index.html')
);

// Google Fonts
workbox.routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' ||
               url.origin === 'https://fonts.gstatic.com',
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 10
      })
    ]
  })
);

// Images
workbox.routing.registerRoute(
  ({ url }) => url.pathname.match(/\.(?:png|jpg|jpeg|svg|gif)$/),
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
);

// API calls
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5
      })
    ]
  })
);

// Skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications handler
self.addEventListener('push', (event) => {
  console.log('Push notification recibida:', event);
  
  let notificationData = {
    title: 'Nueva notificación',
    body: 'Tienes una nueva notificación',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {}
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error('Error parseando datos de push:', e);
      if (event.data.text) {
        notificationData.body = event.data.text();
      }
    }
  }

  const notificationOptions = {
    title: notificationData.title || 'Nueva notificación',
    body: notificationData.body || 'Tienes una nueva notificación',
    icon: notificationData.icon || '/logo192.png',
    badge: notificationData.badge || '/logo192.png',
    data: notificationData.data || {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
    tag: notificationData.data?.tipo || 'notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(notificationOptions.title, notificationOptions)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada:', event);
  
  event.notification.close();

  const notificationData = event.notification.data;
  let urlToOpen = '/';

  // Determinar la URL según el tipo de notificación
  if (notificationData?.tipo === 'reserva' && notificationData?.relacionado_id) {
    urlToOpen = '/reservas';
  } else if (notificationData?.tipo === 'pago' && notificationData?.relacionado_id) {
    urlToOpen = '/reservas';
  } else if (notificationData?.tipo === 'mensaje' || notificationData?.tipo === 'sistema') {
    urlToOpen = '/notificaciones';
  } else {
    urlToOpen = '/notificaciones';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
