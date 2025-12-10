import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import moment from 'moment';
import swalConfig from '../utils/swalConfig';
import FormCard from '../components/ui/FormCard';
import FormInput from '../components/ui/FormInput';
import FormSelect from '../components/ui/FormSelect';
import FormTextarea from '../components/ui/FormTextarea';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Reservas = () => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('nuevas'); // 'nuevas' o 'pasadas'
  const [formData, setFormData] = useState({
    cancha_id: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    notas: ''
  });
  const [canchas, setCanchas] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { getConfig } = useConfig();

  useEffect(() => {
    loadReservas();
    loadCanchas();
    
    // Si viene desde Horarios con datos prellenados
    if (location.state) {
      setFormData({
        cancha_id: location.state.cancha_id || '',
        fecha: location.state.fecha || '',
        hora_inicio: location.state.hora_inicio || '',
        hora_fin: location.state.hora_fin || '',
        notas: ''
      });
      setMostrarFormulario(true);
    }
  }, [location]);

  const loadReservas = async () => {
    try {
      const response = await api.get('/reservas');
      setReservas(response.data);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCanchas = async () => {
    try {
      const response = await api.get('/canchas?activa=true');
      setCanchas(response.data);
    } catch (error) {
      console.error('Error cargando canchas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/reservas', formData);
      
      swalConfig.toastSuccess('¡Reserva Creada!', 'Tu reserva ha sido creada exitosamente');

      setMostrarFormulario(false);
      setFormData({
        cancha_id: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        notas: ''
      });
      loadReservas();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al crear la reserva');
    }
  };

  const handleCancelar = async (id) => {
    const result = await swalConfig.confirm(
      '¿Cancelar reserva?',
      'Esta acción no se puede deshacer. ¿Estás seguro?',
      {
        confirmText: 'Sí, cancelar',
        confirmColor: '#ef4444',
        cancelText: 'No, mantener'
      }
    );

    if (result.isConfirmed) {
      try {
        await api.put(`/reservas/${id}/cancelar`);
        swalConfig.toastSuccess('Reserva Cancelada', 'La reserva se ha cancelado correctamente');
        loadReservas();
      } catch (error) {
        swalConfig.toastError('Error', 'Error al cancelar la reserva');
      }
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      confirmada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
      completada: 'bg-blue-100 text-blue-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  // Calcular días restantes para pagar
  const calcularDiasRestantes = (fechaCreacion) => {
    if (!fechaCreacion) return null;
    const diasMax = parseInt(getConfig('dias_max_pago') || '3', 10);
    const fechaLimite = moment(fechaCreacion).add(diasMax, 'days');
    const diasRestantes = fechaLimite.diff(moment(), 'days');
    return diasRestantes;
  };

  // Filtrar reservas según el tipo (nuevas o pasadas)
  const reservasFiltradas = reservas.filter((reserva) => {
    const fechaReserva = moment(reserva.fecha);
    const hoy = moment().startOf('day');
    
    if (filtroTipo === 'nuevas') {
      // Reservas nuevas: fecha >= hoy
      return fechaReserva.isSameOrAfter(hoy, 'day');
    } else {
      // Reservas pasadas: fecha < hoy
      return fechaReserva.isBefore(hoy, 'day');
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Mis Reservas</h1>
          <p className="text-gray-600">Gestiona todas tus reservas de canchas</p>
        </div>
        <Button
          variant={mostrarFormulario ? 'secondary' : 'primary'}
          onClick={() => {
            setMostrarFormulario(!mostrarFormulario);
            if (!mostrarFormulario) {
              navigate('/app/horarios');
            }
          }}
          icon={mostrarFormulario ? '📅' : '➕'}
        >
          {mostrarFormulario ? 'Ver Horarios' : 'Nueva Reserva'}
        </Button>
      </div>

      {mostrarFormulario && (
        <FormCard
          title="Nueva Reserva"
          subtitle="Completa los datos para crear una nueva reserva"
          onSubmit={handleSubmit}
          onCancel={() => setMostrarFormulario(false)}
          submitLabel="Crear Reserva"
          cancelLabel="Cancelar"
          className="mb-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <FormSelect
              label="Cancha"
              value={formData.cancha_id}
              onChange={(e) => setFormData({ ...formData, cancha_id: e.target.value })}
              options={canchas.map(c => ({ value: c.id, label: c.nombre }))}
              placeholder="Seleccionar cancha"
              required
              icon="⚽"
            />

            <FormInput
              label="Fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              min={moment().format('YYYY-MM-DD')}
              required
              icon="📅"
            />

            <FormInput
              label="Hora Inicio"
              type="time"
              value={formData.hora_inicio}
              onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
              required
              icon="🕐"
            />

            <FormInput
              label="Hora Fin"
              type="time"
              value={formData.hora_fin}
              onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
              required
              icon="🕐"
            />
          </div>

          <FormTextarea
            label="Notas (opcional)"
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            placeholder="Agrega alguna nota o comentario sobre tu reserva..."
            rows="3"
            icon="📝"
          />
        </FormCard>
      )}

      {/* Tabs para Reservas Nuevas y Pasadas */}
      {!loading && reservas.length > 0 && (
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setFiltroTipo('nuevas')}
            className={`px-6 py-3 font-semibold text-lg transition-all duration-200 border-b-4 ${
              filtroTipo === 'nuevas'
                ? 'border-green-500 text-green-600 bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📅 Reservas Nuevas
          </button>
          <button
            onClick={() => setFiltroTipo('pasadas')}
            className={`px-6 py-3 font-semibold text-lg transition-all duration-200 border-b-4 ${
              filtroTipo === 'pasadas'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📜 Reservas Pasadas
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Cargando reservas...</div>
        </div>
      ) : reservas.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6 animate-bounce">📋</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No tienes reservas</h3>
          <p className="text-gray-600 mb-8 text-lg">Crea tu primera reserva para comenzar</p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/app/horarios')}
            icon="📅"
          >
            Ver Horarios Disponibles
          </Button>
        </Card>
      ) : reservasFiltradas.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6">📋</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            No hay {filtroTipo === 'nuevas' ? 'reservas nuevas' : 'reservas pasadas'}
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            {filtroTipo === 'nuevas' 
              ? 'Todavía no tienes reservas futuras' 
              : 'Todavía no tienes reservas pasadas'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservasFiltradas.map((reserva) => (
            <Card
              key={reserva.id}
              className="border-l-4 border-green-500 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {reserva.cancha_nombre}
                    </h3>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md ${getEstadoColor(reserva.estado)}`}>
                      {reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 text-xl">📅</span>
                      <div>
                        <p className="text-xs text-gray-500">Fecha</p>
                        <p className="font-semibold">{moment(reserva.fecha).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 text-xl">🕐</span>
                      <div>
                        <p className="text-xs text-gray-500">Horario</p>
                        <p className="font-semibold">{reserva.hora_inicio} - {reserva.hora_fin}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 text-xl">💰</span>
                      <div>
                        <p className="text-xs text-gray-500">Costo</p>
                        <p className="font-semibold text-green-600">S/.{reserva.costo_total}</p>
                      </div>
                    </div>
                  </div>
                  
                  {reserva.notas && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong className="text-gray-700">📝 Notas:</strong> {reserva.notas}
                      </p>
                    </div>
                  )}

                  {/* Contador de días restantes para pagar (solo para reservas pendientes sin pago confirmado) */}
                  {reserva.estado === 'pendiente' && reserva.pago_estado !== 'confirmado' && reserva.created_at && (
                    (() => {
                      const diasRestantes = calcularDiasRestantes(reserva.created_at);
                      const diasMax = parseInt(getConfig('dias_max_pago') || '3', 10);
                      
                      if (diasRestantes !== null) {
                        if (diasRestantes < 0) {
                          return (
                            <div className="mt-4 p-4 bg-red-50 rounded-lg border-2 border-red-300">
                              <p className="text-sm font-bold text-red-800 mb-1">
                                ⚠️ Tiempo de pago vencido
                              </p>
                              <p className="text-xs text-red-700">
                                Esta reserva será cancelada automáticamente y el horario se liberará.
                              </p>
                            </div>
                          );
                        } else if (diasRestantes === 0) {
                          return (
                            <div className="mt-4 p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
                              <p className="text-sm font-bold text-orange-800 mb-1">
                                ⚠️ Último día para pagar
                              </p>
                              <p className="text-xs text-orange-700">
                                Debes realizar el pago hoy o la reserva se cancelará automáticamente y se liberará el horario.
                              </p>
                            </div>
                          );
                        } else if (diasRestantes === 1) {
                          return (
                            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                              <p className="text-sm font-bold text-yellow-800 mb-1">
                                ⏰ Queda 1 día para pagar
                              </p>
                              <p className="text-xs text-yellow-700">
                                Realiza el pago antes de mañana o la reserva se cancelará automáticamente y se liberará el horario.
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm font-semibold text-blue-800">
                                ⏰ Tienes <strong className="text-lg">{diasRestantes} día{diasRestantes !== 1 ? 's' : ''}</strong> para realizar el pago
                              </p>
                              <p className="text-xs text-blue-700 mt-1">
                                Si no pagas en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}, la reserva se cancelará automáticamente y se liberará el horario.
                              </p>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()
                  )}

                  {/* Contactos de WhatsApp para esta cancha */}
                  {reserva.contactos && reserva.contactos.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        💰 Puedes mandar el capture de tu Yape o Depósito a estos números:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {reserva.contactos.map((telefono, idx) => (
                          <a
                            key={idx}
                            href={`https://wa.me/${telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            <span className="text-lg">💬</span>
                            <span>{telefono}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex flex-col gap-2">
                  {reserva.estado !== 'cancelada' && reserva.estado !== 'completada' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancelar(reserva.id)}
                      icon="❌"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reservas;

