import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import moment from 'moment';

const NotificacionesBadge = ({ usuarioId, rol, variant = 'horizontal', onNavigate }) => {
  // Todos los hooks deben estar al principio, antes de cualquier return condicional
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const dropdownContentRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const loadNotificaciones = async () => {
    try {
      const response = await api.get('/notificaciones?leida=false');
      const notifs = response.data || [];
      setNotificacionesNoLeidas(notifs.length);
      setNotificaciones(notifs.slice(0, 5)); // Solo las últimas 5 para el dropdown
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioId) {
      loadNotificaciones();
      // Actualizar cada 30 segundos
      const interval = setInterval(loadNotificaciones, 30000);
      return () => clearInterval(interval);
    }
  }, [usuarioId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideDropdown = 
        (dropdownRef.current && dropdownRef.current.contains(event.target)) ||
        (dropdownContentRef.current && dropdownContentRef.current.contains(event.target));
      
      if (!isClickInsideDropdown) {
        setMostrarDropdown(false);
      }
    };

    if (mostrarDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarDropdown]);


  const marcarComoLeido = async (notificacionId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.put(`/notificaciones/${notificacionId}/leer`);
      loadNotificaciones();
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  };

  const getRutaNotificaciones = () => {
    if (rol === 'admin') return '/admin/notificaciones';
    if (rol === 'empleado') return '/empleado/notificaciones';
    return '/app/notificaciones';
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // En el rol Empleado (variante vertical), redirigir directamente a la página
    if (variant === 'vertical') {
      navigate(getRutaNotificaciones());
      if (onNavigate) onNavigate();
      return;
    }
    
    // Para otros roles, mostrar el dropdown
    setMostrarDropdown(!mostrarDropdown);
  };

  const handleVerTodas = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(getRutaNotificaciones());
    setMostrarDropdown(false);
    if (onNavigate) onNavigate();
  };

  if (loading) {
    return null;
  }

  // Variante horizontal (para MainLayout - usuario)
  if (variant === 'horizontal') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={handleClick}
          className="relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-w-[80px] lg:min-w-[100px] text-gray-700 hover:bg-green-50 hover:shadow-md"
          title="Notificaciones"
        >
          <span className="text-2xl lg:text-3xl mb-1">🔔</span>
          <span className="text-xs lg:text-sm font-semibold">Notificaciones</span>
          {notificacionesNoLeidas > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
            </span>
          )}
        </button>

        {mostrarDropdown && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-green-50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Notificaciones</h3>
                {notificacionesNoLeidas > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {notificacionesNoLeidas} nueva{notificacionesNoLeidas !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {notificaciones.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-sm">No hay notificaciones nuevas</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notificaciones.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                        !notif.leida ? 'bg-green-50' : ''
                      }`}
                      onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(getRutaNotificaciones());
                      setMostrarDropdown(false);
                      if (onNavigate) onNavigate();
                    }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-800 mb-1">{notif.titulo}</p>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{notif.mensaje}</p>
                          <p className="text-xs text-gray-400">{moment(notif.created_at).fromNow()}</p>
                        </div>
                        {!notif.leida && (
                          <button
                            onClick={(e) => marcarComoLeido(notif.id, e)}
                            className="ml-2 p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Marcar como leída"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleVerTodas}
                className="w-full text-center text-sm font-semibold text-green-600 hover:text-green-700"
              >
                Ver todas las notificaciones →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variante vertical (para EmpleadoLayout - sidebar)
  // En este rol, redirige directamente a la página sin mostrar dropdown
  return (
    <Link
      to={getRutaNotificaciones()}
      onClick={(e) => {
        e.stopPropagation();
        if (onNavigate) onNavigate();
      }}
      className={`relative w-full flex items-center space-x-3 p-3 rounded-lg transition ${
        location?.pathname === getRutaNotificaciones()
          ? 'bg-green-600 text-white'
          : 'text-gray-700 hover:bg-green-50'
      }`}
      title="Notificaciones"
    >
      <span className="text-xl">🔔</span>
      <span className="font-medium">Notificaciones</span>
      {notificacionesNoLeidas > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
        </span>
      )}
    </Link>
  );
};

export default NotificacionesBadge;

