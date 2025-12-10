import React, { useEffect, useState } from 'react';
import api from '../services/api';
import swalConfig from '../utils/swalConfig';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import moment from 'moment';

const Mensajes = () => {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroLeido, setFiltroLeido] = useState('todos'); // 'todos', 'leidos', 'no_leidos'

  useEffect(() => {
    loadMensajes();
  }, [filtroLeido]);

  const loadMensajes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroLeido === 'leidos') {
        params.leido = 'true';
      } else if (filtroLeido === 'no_leidos') {
        params.leido = 'false';
      }
      
      const response = await api.get('/mensajes/recibidos', { params });
      setMensajes(response.data);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      swalConfig.toastError('Error', 'Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeido = async (mensajeId) => {
    try {
      await api.put(`/mensajes/${mensajeId}/leer`);
      loadMensajes();
    } catch (error) {
      console.error('Error marcando mensaje como leído:', error);
      swalConfig.toastError('Error', 'Error al marcar el mensaje como leído');
    }
  };

  const mensajesNoLeidos = mensajes.filter(m => !m.leido).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">📨 Mis Mensajes</h1>
          <p className="text-gray-600">Mensajes y alertas recibidos</p>
        </div>
        {mensajesNoLeidos > 0 && (
          <div className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold">
            {mensajesNoLeidos} no leído{mensajesNoLeidos !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFiltroLeido('todos')}
          className={`px-6 py-3 font-semibold text-lg transition-all duration-200 border-b-4 ${
            filtroLeido === 'todos'
              ? 'border-green-500 text-green-600 bg-green-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Todos ({mensajes.length})
        </button>
        <button
          onClick={() => setFiltroLeido('no_leidos')}
          className={`px-6 py-3 font-semibold text-lg transition-all duration-200 border-b-4 ${
            filtroLeido === 'no_leidos'
              ? 'border-red-500 text-red-600 bg-red-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          No Leídos ({mensajesNoLeidos})
        </button>
        <button
          onClick={() => setFiltroLeido('leidos')}
          className={`px-6 py-3 font-semibold text-lg transition-all duration-200 border-b-4 ${
            filtroLeido === 'leidos'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Leídos ({mensajes.length - mensajesNoLeidos})
        </button>
      </div>

      {loading ? (
        <Card className="text-center py-12">
          <div className="text-gray-500">Cargando mensajes...</div>
        </Card>
      ) : mensajes.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6">📨</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No tienes mensajes</h3>
          <p className="text-gray-600">Los mensajes que recibas aparecerán aquí</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {mensajes.map((mensaje) => (
            <Card
              key={mensaje.id}
              className={`border-l-4 transition-all duration-200 ${
                mensaje.leido
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-green-500 bg-white shadow-md'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-800">{mensaje.titulo}</h3>
                      {!mensaje.leido && (
                        <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {mensaje.remitente_nombre} ({mensaje.remitente_rol})
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{mensaje.mensaje}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <span>📅 {moment(mensaje.created_at).format('DD/MM/YYYY HH:mm')}</span>
                    {mensaje.leido && mensaje.leido_at && (
                      <span>✓ Leído: {moment(mensaje.leido_at).format('DD/MM/YYYY HH:mm')}</span>
                    )}
                  </div>
                </div>
                {!mensaje.leido && (
                  <div className="ml-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => marcarComoLeido(mensaje.id)}
                      icon="✓"
                    >
                      Marcar Leído
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

export default Mensajes;

