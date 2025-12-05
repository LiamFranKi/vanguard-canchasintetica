# 🧹 Limpiar Service Worker del Navegador

## Problema
El service worker (workbox) está interceptando las peticiones y causando errores. Esto pasa porque el navegador tiene un service worker antiguo en caché.

## Solución Rápida

### Opción 1: Desde la Consola del Navegador (RECOMENDADO)

1. Abre el navegador que tiene problemas
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Console**
4. Copia y pega este código:

```javascript
// Desregistrar todos los service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(function(success) {
        console.log('Service Worker desregistrado:', registration.scope);
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
  
  console.log('✅ Limpieza completada. Recarga la página ahora.');
}
```

5. Presiona Enter
6. Recarga la página (`Ctrl + R` o `F5`)

### Opción 2: Desde DevTools

1. Abre DevTools (`F12`)
2. Ve a la pestaña **Application** (o **Aplicación**)
3. En el menú lateral, busca **Service Workers**
4. Click en **Unregister** para cada service worker
5. Ve a **Cache Storage** y elimina todos los cachés
6. Recarga la página

### Opción 3: Modo Incógnito

Abre http://localhost:3000 en modo incógnito (`Ctrl + Shift + N`). Esto evita el caché y service workers.

### Opción 4: Limpiar Todo el Caché

1. Presiona `Ctrl + Shift + Delete`
2. Selecciona "Caché" y "Service Workers"
3. Marca "Desde siempre"
4. Click en "Borrar datos"
5. Recarga la página

---

## ✅ Verificación

Después de limpiar, deberías ver:
- ✅ La página carga correctamente
- ✅ Sin errores de workbox en la consola
- ✅ Sin errores de MIME type

---

## 🔒 Prevención

Ya deshabilitamos el service worker en desarrollo. Solo funcionará en producción (cuando hagas `npm run build`).

Si el problema persiste, usa el navegador que funciona o limpia el caché del que tiene problemas.


