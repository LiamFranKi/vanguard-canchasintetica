import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import swalConfig from '../../utils/swalConfig';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import FormTextarea from '../../components/ui/FormTextarea';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import moment from 'moment';

const AdminMensajes = () => {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensajesEnviados, setMensajesEnviados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [formData, setFormData] = useState({
    tipo_envio: 'todos',
    titulo: '',
    mensaje: '',
    usuarios_ids: [],
    enviar_email: true,
    enviar_notificacion: true,
    enviar_push: true
  });

  useEffect(() => {
    loadMensajesEnviados();
  }, []);

  useEffect(() => {
    if (busquedaUsuario.length >= 2) {
      buscarUsuarios();
    } else {
      setUsuariosDisponibles([]);
    }
  }, [busquedaUsuario]);

  const loadMensajesEnviados = async () => {
    try {
      setLoading(true);
      const response = await api.get('/mensajes/enviados');
      setMensajesEnviados(response.data);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      swalConfig.toastError('Error', 'Error al cargar los mensajes enviados');
    } finally {
      setLoading(false);
    }
  };

  const buscarUsuarios = async () => {
    try {
      const response = await api.get(`/mensajes/usuarios?search=${encodeURIComponent(busquedaUsuario)}`);
      setUsuariosDisponibles(response.data);
    } catch (error) {
      console.error('Error buscando usuarios:', error);
    }
  };

  const toggleUsuarioSeleccionado = (usuarioId) => {
    setFormData(prev => ({
      ...prev,
      usuarios_ids: prev.usuarios_ids.includes(usuarioId)
        ? prev.usuarios_ids.filter(id => id !== usuarioId)
        : [...prev.usuarios_ids, usuarioId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.titulo.trim()) {
      swalConfig.toastError('Error', 'El título es requerido');
      return;
    }

    if (!formData.mensaje.trim()) {
      swalConfig.toastError('Error', 'El mensaje es requerido');
      return;
    }

    if (formData.tipo_envio === 'especificos' && formData.usuarios_ids.length === 0) {
      swalConfig.toastError('Error', 'Debes seleccionar al menos un destinatario');
      return;
    }

    try {
      await api.post('/mensajes', formData);
      swalConfig.toastSuccess('¡Mensaje Enviado!', 'El mensaje se ha enviado correctamente');
      setMostrarFormulario(false);
      setFormData({
        tipo_envio: 'todos',
        titulo: '',
        mensaje: '',
        usuarios_ids: [],
        enviar_email: true,
        enviar_notificacion: true,
        enviar_push: true
      });
      setBusquedaUsuario('');
      setUsuariosDisponibles([]);
      loadMensajesEnviados();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al enviar el mensaje');
    }
  };

  const getTipoEnvioLabel = (tipo) => {
    const labels = {
      todos: 'Todos (Empleados + Usuarios)',
      empleados: 'Solo Empleados',
      usuarios: 'Solo Usuarios',
      especificos: 'Usuarios Específicos'
    };
    return labels[tipo] || tipo;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">📨 Mensajes y Alertas</h1>
          <p className="text-gray-600">Envía mensajes a empleados, usuarios o ambos</p>
        </div>
        <Button
          variant={mostrarFormulario ? 'secondary' : 'primary'}
          onClick={() => {
            setMostrarFormulario(!mostrarFormulario);
            if (!mostrarFormulario) {
              setFormData({
                tipo_envio: 'todos',
                titulo: '',
                mensaje: '',
                usuarios_ids: [],
                enviar_email: true,
                enviar_notificacion: true,
                enviar_push: true
              });
            }
          }}
          icon={mostrarFormulario ? '✕' : '➕'}
        >
          {mostrarFormulario ? 'Cancelar' : 'Nuevo Mensaje'}
        </Button>
      </div>

      {mostrarFormulario && (
        <FormCard
          title="Enviar Mensaje"
          subtitle="Completa los datos para enviar un mensaje"
          onSubmit={handleSubmit}
          onCancel={() => {
            setMostrarFormulario(false);
            setFormData({
              tipo_envio: 'todos',
              titulo: '',
              mensaje: '',
              usuarios_ids: [],
              enviar_email: true,
              enviar_notificacion: true,
              enviar_push: true
            });
            setBusquedaUsuario('');
            setUsuariosDisponibles([]);
          }}
          submitLabel="Enviar Mensaje"
          cancelLabel="Cancelar"
          className="mb-6"
        >
          <FormSelect
            label="Enviar a"
            value={formData.tipo_envio}
            onChange={(e) => {
              setFormData({ ...formData, tipo_envio: e.target.value, usuarios_ids: [] });
              setBusquedaUsuario('');
              setUsuariosDisponibles([]);
            }}
            options={[
              { value: 'todos', label: 'Todos (Empleados + Usuarios)' },
              { value: 'empleados', label: 'Solo Empleados' },
              { value: 'usuarios', label: 'Solo Usuarios' },
              { value: 'especificos', label: 'Usuarios Específicos' }
            ]}
            required
            icon="👥"
          />

          {formData.tipo_envio === 'especificos' && (
            <div className="mb-4">
              <FormInput
                label="Buscar Usuarios"
                type="text"
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                placeholder="Buscar por DNI, nombre o apellido..."
                icon="🔍"
              />

              {usuariosDisponibles.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg max-h-64 overflow-y-auto">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    {usuariosDisponibles.length} usuario{usuariosDisponibles.length !== 1 ? 's' : ''} encontrado{usuariosDisponibles.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="space-y-2">
                    {usuariosDisponibles.map(usuario => (
                      <button
                        key={usuario.id}
                        type="button"
                        onClick={() => toggleUsuarioSeleccionado(usuario.id)}
                        className={`w-full text-left p-3 bg-white rounded-lg hover:bg-blue-100 transition border-2 ${
                          formData.usuarios_ids.includes(usuario.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-800">
                              {usuario.nombre} {usuario.apellido}
                            </div>
                            <div className="text-sm text-gray-600">
                              DNI: {usuario.dni} | {usuario.rol}
                            </div>
                          </div>
                          {formData.usuarios_ids.includes(usuario.id) && (
                            <span className="text-green-600 text-xl">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.usuarios_ids.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">
                    ✓ {formData.usuarios_ids.length} usuario{formData.usuarios_ids.length !== 1 ? 's' : ''} seleccionado{formData.usuarios_ids.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          <FormInput
            label="Título"
            type="text"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            placeholder="Ej: Mantenimiento Programado"
            required
            icon="📝"
          />

          <FormTextarea
            label="Mensaje"
            value={formData.mensaje}
            onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
            placeholder="Escribe el contenido del mensaje..."
            rows="6"
            required
            icon="💬"
          />

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-3">Canales de Envío:</p>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enviar_email}
                  onChange={(e) => setFormData({ ...formData, enviar_email: e.target.checked })}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">📧 Enviar por Email</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enviar_notificacion}
                  onChange={(e) => setFormData({ ...formData, enviar_notificacion: e.target.checked })}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">🔔 Notificación en el Sistema</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enviar_push}
                  onChange={(e) => setFormData({ ...formData, enviar_push: e.target.checked })}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">📱 Push Notification</span>
              </label>
            </div>
          </div>
        </FormCard>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Mensajes Enviados</h2>
        {loading ? (
          <Card className="text-center py-12">
            <div className="text-gray-500">Cargando mensajes...</div>
          </Card>
        ) : mensajesEnviados.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-7xl mb-6">📨</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No hay mensajes enviados</h3>
            <p className="text-gray-600">Envía tu primer mensaje para comenzar</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {mensajesEnviados.map((mensaje) => (
              <Card key={mensaje.id} className="border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{mensaje.titulo}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {getTipoEnvioLabel(mensaje.tipo_envio)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{mensaje.mensaje}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>📅 {moment(mensaje.created_at).format('DD/MM/YYYY HH:mm')}</span>
                      <span>👥 {mensaje.destinatarios_count || 'Todos'} destinatario{mensaje.destinatarios_count !== 1 ? 's' : ''}</span>
                      {mensaje.leidos_count > 0 && (
                        <span>✓ {mensaje.leidos_count} leído{mensaje.leidos_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mensaje.enviar_email && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">📧 Email</span>
                      )}
                      {mensaje.enviar_notificacion && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">🔔 Sistema</span>
                      )}
                      {mensaje.enviar_push && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">📱 Push</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMensajes;

