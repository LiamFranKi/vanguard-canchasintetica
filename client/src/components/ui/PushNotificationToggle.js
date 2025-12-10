import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import swalConfig from '../../utils/swalConfig';

const PushNotificationToggle = ({ usuarioId, variant = 'icon', onToggle }) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const init = async () => {
      const isSupported = 
        'serviceWorker' in navigator && 
        'PushManager' in window &&
        'Notification' in window;
      setSupported(isSupported);
      
      if (isSupported && usuarioId) {
        await checkSubscription();
      } else {
        setLoading(false);
      }
    };
    
    init();
  }, [usuarioId]);

  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        setLoading(false);
        setSupported(false);
        return;
      }

      // En desarrollo (localhost), el service worker generalmente no funciona
      // Verificar si estamos en localhost
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.protocol === 'http:';
      
      if (isLocalhost && process.env.NODE_ENV !== 'production') {
        console.log('Notificaciones push no disponibles en localhost. Solo funcionan en producción con HTTPS.');
        setLoading(false);
        setSupported(false);
        return;
      }

      // Intentar obtener el service worker existente
      let registration;
      try {
        registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          // Solo intentar registrar si estamos en producción con HTTPS
          if (window.location.protocol === 'https:' || window.location.hostname !== 'localhost') {
            try {
              registration = await navigator.serviceWorker.register('/service-worker.js');
            } catch (regError) {
              console.log('No se pudo registrar service worker:', regError.message);
              setLoading(false);
              setSupported(false);
              return;
            }
          } else {
            setLoading(false);
            setSupported(false);
            return;
          }
        }

        // Esperar a que esté listo (con timeout)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          timeoutPromise
        ]);
        
        const subscription = await registration.pushManager.getSubscription();
        const isEnabled = !!subscription;
        setEnabled(isEnabled);
      } catch (error) {
        console.log('Service worker no disponible:', error.message);
        setLoading(false);
        setSupported(false);
        return;
      }
    } catch (error) {
      console.error('Error verificando suscripción:', error);
      setEnabled(false);
      setSupported(false);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error solicitando permiso:', error);
      return false;
    }
  };

  const subscribe = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        swalConfig.toastError('No compatible', 'Tu navegador no soporta notificaciones push');
        setLoading(false);
        return;
      }

      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        swalConfig.toastError('Permiso denegado', 'Necesitas permitir las notificaciones para activar esta función');
        setLoading(false);
        return;
      }

      // Asegurar que el service worker esté registrado
      let registration;
      try {
        registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          if (process.env.NODE_ENV === 'production') {
            registration = await navigator.serviceWorker.register('/service-worker.js');
          } else {
            throw new Error('Service worker no disponible en desarrollo');
          }
        }
        registration = await navigator.serviceWorker.ready;
      } catch (error) {
        console.error('Error con service worker:', error);
        swalConfig.toastError('Error', 'Las notificaciones push solo están disponibles en producción con HTTPS');
        setLoading(false);
        return;
      }

      const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('VAPID key no configurada');
        swalConfig.toastError('Error de configuración', 'Las notificaciones push no están configuradas en el servidor');
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      await api.post('/notificaciones/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      });

      // Actualizar estado y verificar nuevamente
      setEnabled(true);
      await checkSubscription(); // Verificar nuevamente para asegurar
      swalConfig.toastSuccess('Activado', 'Notificaciones push activadas correctamente');
    } catch (error) {
      console.error('Error suscribiéndose:', error);
      if (error.response?.status === 401) {
        swalConfig.toastError('Error', 'Necesitas iniciar sesión para activar las notificaciones');
      } else {
        swalConfig.toastError('Error', 'No se pudo activar las notificaciones push. Verifica que el servicio esté configurado correctamente.');
      }
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator)) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        
        // Eliminar del servidor
        try {
          await api.delete('/notificaciones/unsubscribe', {
            data: { endpoint }
          });
        } catch (error) {
          console.error('Error eliminando suscripción del servidor:', error);
        }
        
        // Actualizar estado y verificar nuevamente
        setEnabled(false);
        await checkSubscription(); // Verificar nuevamente para asegurar
        swalConfig.toastSuccess('Desactivado', 'Notificaciones push desactivadas');
      } else {
        setEnabled(false);
      }
    } catch (error) {
      console.error('Error desuscribiéndose:', error);
      // Intentar actualizar el estado de todas formas
      setEnabled(false);
      await checkSubscription();
      swalConfig.toastError('Error', 'No se pudo desactivar completamente las notificaciones push');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    if (enabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // En desarrollo, mostrar el componente pero deshabilitado
  if (!supported) {
    if (process.env.NODE_ENV === 'development') {
      // En desarrollo, mostrar pero deshabilitado con tooltip
      if (variant === 'icon') {
        return (
          <button
            disabled
            className="p-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
            title="Notificaciones push solo disponibles en producción con HTTPS"
          >
            <span className="text-lg">🔕</span>
          </button>
        );
      }
      return (
        <div className="w-full p-3 rounded-lg bg-gray-50 text-gray-400 border border-gray-200 opacity-50">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔕</span>
            <span className="text-sm font-medium">Push (Solo en producción)</span>
          </div>
        </div>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className={`p-2 rounded-lg ${variant === 'icon' ? '' : 'w-full p-3'}`}>
        <span className="text-lg animate-pulse">⏳</span>
      </div>
    );
  }

  // Variante icono pequeño (para header)
  if (variant === 'icon') {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        className={`p-2 rounded-lg transition-all duration-200 ${
          enabled
            ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={enabled ? 'Notificaciones push activadas (click para desactivar)' : 'Activar notificaciones push'}
      >
        <span className="text-lg">{enabled ? '🔔' : '🔕'}</span>
      </button>
    );
  }

  // Variante botón pequeño (para sidebar)
  return (
    <button
      onClick={(e) => {
        toggle(e);
        if (onToggle) onToggle();
      }}
      disabled={loading}
      className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
        enabled
          ? 'bg-green-100 text-green-700 border-2 border-green-400 shadow-sm'
          : 'bg-gray-50 text-gray-600 border border-gray-300'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
      title={enabled ? 'Desactivar notificaciones push' : 'Activar notificaciones push'}
    >
      <div className="flex items-center space-x-2">
        <span className="text-lg">{enabled ? '🔔' : '🔕'}</span>
        <span className="text-sm font-medium">
          {enabled ? 'Push Activado' : 'Push Desactivado'}
        </span>
      </div>
      <span className={`w-10 h-5 rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      }`}>
        <span className={`block w-4 h-4 bg-white rounded-full transform transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        } mt-0.5`} />
      </span>
    </button>
  );
};

export default PushNotificationToggle;

