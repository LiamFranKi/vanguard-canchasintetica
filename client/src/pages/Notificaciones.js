import React, { useEffect, useState } from 'react';
import api from '../services/api';
import swalConfig from '../utils/swalConfig';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import moment from 'moment';

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroLeido, setFiltroLeido] = useState('todos'); // 'todos', 'leidos', 'no_leidos'

  useEffect(() => {
    loadNotificaciones();
  }, [filtroLeido]);

  const loadNotificaciones = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroLeido === 'leidos') {
        params.leida = 'true';
      } else if (filtroLeido === 'no_leidos') {
        params.leida = 'false';
      }
      
      const response = await api.get('/notificaciones', { params });
      setNotificaciones(response.data);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      swalConfig.toastError('Error', 'Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeido = async (notificacionId) => {
    try {
      await api.put(`/notificaciones/${notificacionId}/leer`);
      loadNotificaciones();
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      swalConfig.toastError('Error', 'Error al marcar la notificación como leída');
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      await api.put('/notificaciones/leer-todas');
      swalConfig.toastSuccess('Notificaciones actualizadas', 'Todas las notificaciones han sido marcadas como leídas');
      loadNotificaciones();
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      swalConfig.toastError('Error', 'Error al marcar las notificaciones como leídas');
    }
  };

  const getTipoIcono = (tipo) => {
    const iconos = {
      info: 'ℹ️',
      reserva: '📅',
      pago: '💳',
      sistema: '🔔',
      mensaje: '📨'
    };
    return iconos[tipo] || '🔔';
  };

  const getTipoColor = (tipo) => {
    const colores = {
      info: 'bg-blue-100 text-blue-800',
      reserva: 'bg-green-100 text-green-800',
      pago: 'bg-yellow-100 text-yellow-800',
      sistema: 'bg-purple-100 text-purple-800',
      mensaje: 'bg-indigo-100 text-indigo-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1">🔔 Notificaciones</h1>
          <p className="text-sm sm:text-base text-gray-600">Todas tus notificaciones del sistema</p>
        </div>
        {notificacionesNoLeidas > 0 && (
          <Button
            variant="secondary"
            onClick={marcarTodasComoLeidas}
            icon="✓"
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            Marcar Todas como Leídas
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setFiltroLeido('todos')}
          className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold text-sm sm:text-lg transition-all duration-200 border-b-4 whitespace-nowrap flex-shrink-0 ${
            filtroLeido === 'todos'
              ? 'border-green-500 text-green-600 bg-green-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Todas ({notificaciones.length})
        </button>
        <button
          onClick={() => setFiltroLeido('no_leidos')}
          className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold text-sm sm:text-lg transition-all duration-200 border-b-4 whitespace-nowrap flex-shrink-0 ${
            filtroLeido === 'no_leidos'
              ? 'border-red-500 text-red-600 bg-red-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          No Leídas ({notificacionesNoLeidas})
        </button>
        <button
          onClick={() => setFiltroLeido('leidos')}
          className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold text-sm sm:text-lg transition-all duration-200 border-b-4 whitespace-nowrap flex-shrink-0 ${
            filtroLeido === 'leidos'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Leídas ({notificaciones.length - notificacionesNoLeidas})
        </button>
      </div>

      {loading ? (
        <Card className="text-center py-12">
          <div className="text-gray-500">Cargando notificaciones...</div>
        </Card>
      ) : notificaciones.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6">🔔</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No tienes notificaciones</h3>
          <p className="text-gray-600">Las notificaciones que recibas aparecerán aquí</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notificaciones.map((notificacion) => (
            <Card
              key={notificacion.id}
              className={`border-l-4 transition-all duration-200 ${
                notificacion.leida
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-green-500 bg-white shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3 mb-2">
                    <span className="text-xl sm:text-2xl flex-shrink-0">{getTipoIcono(notificacion.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 flex-1 min-w-0 break-words">{notificacion.titulo}</h3>
                        <div className="flex gap-1 flex-shrink-0">
                          {!notificacion.leida && (
                            <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-semibold whitespace-nowrap">
                              Nuevo
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getTipoColor(notificacion.tipo)}`}>
                            {notificacion.tipo}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm sm:text-base text-gray-700 mb-2 break-words">{notificacion.mensaje}</p>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <span>📅 {moment(notificacion.created_at).format('DD/MM/YYYY HH:mm')}</span>
                        {notificacion.leida && (
                          <span>✓ Leída</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {!notificacion.leida && (
                  <div className="sm:ml-4 flex-shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => marcarComoLeido(notificacion.id)}
                      icon="✓"
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Marcar Leída
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notificaciones;

