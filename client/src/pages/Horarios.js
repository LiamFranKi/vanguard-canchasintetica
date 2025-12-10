import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import moment from 'moment';
import swalConfig from '../utils/swalConfig';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import FormSelect from '../components/ui/FormSelect';
import FormCard from '../components/ui/FormCard';
import FormInput from '../components/ui/FormInput';
import FormTextarea from '../components/ui/FormTextarea';

// Calcular el lunes de la semana actual de forma más robusta
const getLunesSemanaActual = () => {
  const hoy = moment().local();
  const diaSemana = hoy.day(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const diasARetroceder = diaSemana === 0 ? 6 : diaSemana - 1; // Si es domingo, retroceder 6 días
  return hoy.clone().subtract(diasARetroceder, 'days').startOf('day');
};

const Horarios = () => {
  const [canchas, setCanchas] = useState([]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
  const [canchaData, setCanchaData] = useState(null);
  const [semanaActual, setSemanaActual] = useState(getLunesSemanaActual()); // Lunes
  const [reservasSemana, setReservasSemana] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingCanchas, setLoadingCanchas] = useState(true);
  const [diasExpandidos, setDiasExpandidos] = useState({});
  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [formReserva, setFormReserva] = useState({
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    duracion: '30',
    notas: ''
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCanchas();
  }, []);

  useEffect(() => {
    if (canchaSeleccionada) {
      loadCanchaData();
      loadReservasSemana();
    }
  }, [canchaSeleccionada, semanaActual]);

  // Inicializar días expandidos cuando cambia la semana
  useEffect(() => {
    const hoy = moment().local().startOf('day');
    const inicioSemana = semanaActual.clone().local().startOf('day');
    const diff = hoy.diff(inicioSemana, 'days');
    
    if (diff >= 0 && diff < 7) {
      setDiasExpandidos({ [diff]: true });
    } else {
      setDiasExpandidos({ 0: true }); // Por defecto, expandir el lunes
    }
  }, [semanaActual, canchaSeleccionada]);

  const loadCanchas = async () => {
    try {
      setLoadingCanchas(true);
      const response = await api.get('/canchas?activa=true');
      setCanchas(response.data);
    } catch (error) {
      console.error('Error cargando canchas:', error);
      swalConfig.toastError('Error', 'Error al cargar las canchas disponibles');
    } finally {
      setLoadingCanchas(false);
    }
  };

  const loadCanchaData = async () => {
    if (!canchaSeleccionada) return;
    
    try {
      const response = await api.get(`/canchas/${canchaSeleccionada}`);
      setCanchaData(response.data);
    } catch (error) {
      console.error('Error cargando datos de cancha:', error);
      swalConfig.toastError('Error', 'Error al cargar los datos de la cancha');
    }
  };

  const loadReservasSemana = async () => {
    if (!canchaSeleccionada) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/reservas/semanal/${canchaSeleccionada}`, {
        params: {
          fecha_inicio: semanaActual.format('YYYY-MM-DD')
        }
      });
      
      const reservasPorFecha = {};
      response.data.dias.forEach(dia => {
        reservasPorFecha[dia.fecha] = dia.reservas || [];
      });
      
      setReservasSemana(reservasPorFecha);
    } catch (error) {
      console.error('Error cargando reservas:', error);
      swalConfig.toastError('Error', 'Error al cargar las reservas');
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (index) => {
    setDiasExpandidos(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const cambiarSemana = (direccion) => {
    setSemanaActual(prev => prev.clone().add(direccion, 'weeks'));
  };

  const generarSlots = (fecha) => {
    if (!canchaData) return [];
    
    const slots = [];
    const horaInicio = moment(canchaData.hora_inicio_atencion || '08:00', 'HH:mm');
    const horaFin = moment(canchaData.hora_fin_atencion || '23:00', 'HH:mm');
    
    let current = horaInicio.clone();
    while (current.isBefore(horaFin)) {
      const inicio = current.format('HH:mm');
      const fin = current.clone().add(30, 'minutes').format('HH:mm');
      
      // Calcular precio según turno (día/noche) según la hora del slot
      const horaLimite = moment(canchaData.hora_limite_turno || '18:00', 'HH:mm');
      const horaSlot = moment(inicio, 'HH:mm');
      const esTurnoNoche = horaSlot.isSameOrAfter(horaLimite);
      
      const precio30min = esTurnoNoche 
        ? parseFloat(canchaData.precio_30min_noche || canchaData.precio_30min || 35)
        : parseFloat(canchaData.precio_30min_dia || canchaData.precio_30min || 25);
      
      slots.push({
        inicio,
        fin,
        precio30min,
        precio1hora: esTurnoNoche
          ? parseFloat(canchaData.precio_1hora_noche || canchaData.precio_1hora || 70)
          : parseFloat(canchaData.precio_1hora_dia || canchaData.precio_1hora || 50)
      });
      
      current.add(30, 'minutes');
    }
    
    return slots;
  };

  const obtenerReservaOcupada = (fecha, horaInicio, horaFin) => {
    const fechaStr = moment(fecha).format('YYYY-MM-DD');
    const reservas = reservasSemana[fechaStr] || [];
    
    return reservas.find(reserva => {
      if (reserva.estado === 'cancelada') return false;
      
      const reservaInicio = moment(reserva.hora_inicio, 'HH:mm:ss');
      const reservaFin = moment(reserva.hora_fin, 'HH:mm:ss');
      const slotInicio = moment(horaInicio, 'HH:mm');
      const slotFin = moment(horaFin, 'HH:mm');
      
      return (
        (slotInicio.isBefore(reservaFin) && slotFin.isAfter(reservaInicio))
      );
    });
  };

  const estaOcupado = (fecha, horaInicio, horaFin) => {
    return !!obtenerReservaOcupada(fecha, horaInicio, horaFin);
  };

  const calcularHoraFin = (horaInicio, duracion) => {
    const inicio = moment(horaInicio, 'HH:mm');
    return inicio.clone().add(parseInt(duracion), 'minutes').format('HH:mm');
  };

  const calcularPrecio = (duracion, horaInicio = null) => {
    if (!canchaData) return 0;
    
    const minutos = typeof duracion === 'string' ? parseInt(duracion) : duracion;
    
    // Determinar turno (día/noche) según la hora de inicio
    let precio30min, precio1hora;
    if (horaInicio) {
      const horaLimite = moment(canchaData.hora_limite_turno || '18:00', 'HH:mm');
      const horaInicioMoment = moment(horaInicio, 'HH:mm');
      const esTurnoNoche = horaInicioMoment.isSameOrAfter(horaLimite);
      
      if (esTurnoNoche) {
        precio30min = parseFloat(canchaData.precio_30min_noche || canchaData.precio_30min || 35);
        precio1hora = parseFloat(canchaData.precio_1hora_noche || canchaData.precio_1hora || 70);
      } else {
        precio30min = parseFloat(canchaData.precio_30min_dia || canchaData.precio_30min || 25);
        precio1hora = parseFloat(canchaData.precio_1hora_dia || canchaData.precio_1hora || 50);
      }
    } else {
      precio30min = parseFloat(canchaData.precio_30min || 25);
      precio1hora = parseFloat(canchaData.precio_1hora || 50);
    }
    
    if (minutos <= 30) return precio30min;
    if (minutos <= 60) return precio1hora;
    if (minutos <= 90) return precio1hora + precio30min;
    if (minutos <= 120) return precio1hora * 2;
    
    return (precio1hora / 60) * minutos;
  };

  const handleSlotClick = (fecha, slot) => {
    const reservaOcupada = obtenerReservaOcupada(fecha, slot.inicio, slot.fin);
    
    if (reservaOcupada) {
      // Si está ocupado, solo mostrar información (el usuario no puede editar reservas de otros)
      swalConfig.toastError('Horario Ocupado', `Este horario está reservado por ${reservaOcupada.usuario_nombre || 'otro usuario'}`);
      return;
    }

    // Si está disponible, abrir modal de reserva
    const fechaStr = moment(fecha).format('YYYY-MM-DD');
    setSlotSeleccionado({ fecha, slot });
    setFormReserva({
      fecha: fechaStr,
      hora_inicio: slot.inicio,
      hora_fin: slot.fin,
      duracion: '30',
      notas: ''
    });
    setMostrarModalReserva(true);
  };

  const handleReservaSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !user.id) {
      swalConfig.toastError('Error', 'No se pudo obtener la información del usuario');
      return;
    }

    const horaFinCalculada = calcularHoraFin(formReserva.hora_inicio, formReserva.duracion);
    const precioCalculado = calcularPrecio(formReserva.duracion, formReserva.hora_inicio);

    try {
      await api.post('/reservas', {
        cancha_id: canchaSeleccionada,
        usuario_id: user.id, // El usuario actual crea su propia reserva
        fecha: formReserva.fecha,
        hora_inicio: formReserva.hora_inicio,
        hora_fin: horaFinCalculada,
        notas: formReserva.notas,
        costo_total: precioCalculado
      });

      swalConfig.toastSuccess('¡Reserva Creada!', `Reserva creada exitosamente. Costo: S/.${precioCalculado.toFixed(2)}`);
      
      setMostrarModalReserva(false);
      setSlotSeleccionado(null);
      setFormReserva({
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        duracion: '30',
        notas: ''
      });
      loadReservasSemana();
      
      // Redirigir a Mis Reservas después de crear la reserva
      setTimeout(() => {
        navigate('/app/reservas');
      }, 1000);
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al crear la reserva');
    }
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="min-h-full relative">
      {/* Fondo decorativo con temática de fútbol */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 opacity-50 -z-10"></div>
      <div 
        className="absolute inset-0 opacity-5 -z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 100c0-44.18 35.82-80 80-80s80 35.82 80 80c0 44.18-35.82 80-80 80s-80-35.82-80-80zm140 0c0-33.14-26.86-60-60-60S40 66.86 40 100s26.86 60 60 60 60-26.86 60-60z' fill='%2322c55e'/%3E%3Cpath d='M100 40v120M40 100h120' stroke='%2322c55e' stroke-width='2'/%3E%3C/svg%3E")`,
          backgroundSize: '300px 300px'
        }}
      ></div>

      {/* Header - Solo mostrar cuando hay cancha seleccionada */}
      {canchaSeleccionada && (
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-green-100">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              ⚽ Horarios y Disponibilidad
            </h1>
            <p className="text-gray-600 text-lg">Selecciona un horario disponible para hacer tu reserva</p>
            
            {/* Selector de Cancha para cambiar */}
            <div className="mt-6 flex flex-col md:flex-row items-start md:items-end gap-4">
              <div className="flex-1 w-full md:w-auto md:min-w-[300px]">
                <FormSelect
                  label="Cambiar Cancha"
                  value={canchaSeleccionada || ''}
                  onChange={(e) => {
                    const nuevaCancha = parseInt(e.target.value);
                    setCanchaSeleccionada(nuevaCancha);
                    setReservasSemana({});
                  }}
                  options={canchas.map(c => ({ value: c.id, label: c.nombre }))}
                  placeholder="Selecciona otra cancha"
                  icon="⚽"
                  className="w-full"
                />
              </div>
              <Button
                variant="secondary"
              onClick={() => {
                setCanchaSeleccionada(null);
                setReservasSemana({});
                setCanchaData(null);
              }}
                icon="↩️"
                className="w-full md:w-auto"
              >
                Ver Todas las Canchas
              </Button>
            </div>

            {/* Navegación de semana */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => cambiarSemana(-1)}
                icon="←"
                className="w-full md:w-auto"
              >
                Semana Anterior
              </Button>
              <div className="text-center bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-xl">
                <h2 className="text-xl font-bold text-gray-800">
                  {semanaActual.format('DD/MM/YYYY')} - {semanaActual.clone().add(6, 'days').format('DD/MM/YYYY')}
                </h2>
                <p className="text-sm text-gray-600 font-medium">Semana actual</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => cambiarSemana(1)}
                icon="→"
                className="w-full md:w-auto"
              >
                Semana Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading canchas */}
      {loadingCanchas && (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6 animate-bounce">⚽</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Cargando canchas...</h3>
          <p className="text-gray-600">Por favor espera un momento</p>
        </Card>
      )}

      {/* Mensaje si no hay canchas */}
      {!loadingCanchas && canchas.length === 0 && (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6">⚽</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No hay canchas disponibles</h3>
          <p className="text-gray-600">Por favor, contacta al administrador</p>
        </Card>
      )}

      {/* Mensaje si no hay cancha seleccionada - Mostrar canchas disponibles */}
      {!loadingCanchas && !canchaSeleccionada && canchas.length > 0 && (
        <div>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Canchas Disponibles</h3>
            <p className="text-gray-600">Selecciona una cancha para ver sus horarios y hacer tu reserva</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {canchas.map(cancha => (
              <Card 
                key={cancha.id} 
                className="overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-green-200 hover:border-green-400 shadow-md hover:shadow-xl"
                  onClick={() => {
                    setCanchaSeleccionada(cancha.id);
                    setReservasSemana({});
                  }}
              >
                {cancha.imagen && (
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${cancha.imagen}`}
                      alt={cancha.nombre}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shadow-lg ${
                        cancha.activa 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {cancha.activa ? '✓ Activa' : '✗ Inactiva'}
                      </span>
                    </div>
                  </div>
                )}
                {!cancha.imagen && (
                  <div className="relative h-32 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                    <div className="text-4xl">⚽</div>
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shadow-lg ${
                        cancha.activa 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {cancha.activa ? '✓ Activa' : '✗ Inactiva'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{cancha.nombre}</h3>
                  {cancha.descripcion && (
                    <p className="text-gray-600 text-xs mb-3 line-clamp-2">{cancha.descripcion}</p>
                  )}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="mr-1.5 text-sm">👥</span>
                      <span>Capacidad: <strong className="ml-1 text-gray-700">{cancha.capacidad} jugadores</strong></span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="mr-1.5 text-sm">🕐</span>
                      <span>Horario: <strong className="ml-1 text-gray-700">
                        {cancha.hora_inicio_atencion ? cancha.hora_inicio_atencion.substring(0, 5) : '08:00'} - {cancha.hora_fin_atencion ? cancha.hora_fin_atencion.substring(0, 5) : '23:00'}
                      </strong></span>
                    </div>
                    {cancha.contactos && (
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="mr-1.5 text-sm">📞</span>
                        <span>N° de Contactos: <strong className="ml-1 text-gray-700">{cancha.contactos}</strong></span>
                      </div>
                    )}
                    
                    {/* Precios por Turno */}
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">💰 Precios</p>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="bg-blue-50 p-1.5 rounded">
                          <div className="font-semibold text-blue-700 mb-0.5 text-xs">🌅 Día</div>
                          <div className="text-gray-600 text-xs">30min: <strong className="text-green-600">S/.{parseFloat(cancha.precio_30min_dia || cancha.precio_30min || 25).toFixed(2)}</strong></div>
                          <div className="text-gray-600 text-xs">1h: <strong className="text-green-600">S/.{parseFloat(cancha.precio_1hora_dia || cancha.precio_1hora || 50).toFixed(2)}</strong></div>
                          {cancha.hora_limite_turno && (
                            <div className="text-xs text-gray-500 mt-0.5">Antes de {cancha.hora_limite_turno.substring(0, 5)}</div>
                          )}
                        </div>
                        <div className="bg-purple-50 p-1.5 rounded">
                          <div className="font-semibold text-purple-700 mb-0.5 text-xs">🌙 Noche</div>
                          <div className="text-gray-600 text-xs">30min: <strong className="text-green-600">S/.{parseFloat(cancha.precio_30min_noche || 35).toFixed(2)}</strong></div>
                          <div className="text-gray-600 text-xs">1h: <strong className="text-green-600">S/.{parseFloat(cancha.precio_1hora_noche || 70).toFixed(2)}</strong></div>
                          {cancha.hora_limite_turno && (
                            <div className="text-xs text-gray-500 mt-0.5">Después de {cancha.hora_limite_turno.substring(0, 5)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="primary"
                      className="w-full text-sm py-2"
                      icon="📅"
                    >
                      Ver Horarios
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Cargando horarios...</div>
        </div>
      ) : canchaData && canchaSeleccionada ? (
        <div className="space-y-6">
          {diasSemana.map((dia, index) => {
            const fecha = semanaActual.clone().add(index, 'days');
            const slots = generarSlots(fecha);
            const estaExpandido = diasExpandidos[index] === true;
            
            return (
              <Card key={index} className="overflow-hidden shadow-lg">
                <button
                  onClick={() => toggleDia(index)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white p-4 hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-between cursor-pointer"
                >
                  <h3 className="text-xl font-bold">
                    {dia} {fecha.format('DD/MM')}
                  </h3>
                  <span className={`text-2xl transition-transform duration-300 ${estaExpandido ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    estaExpandido ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {slots.map((slot, slotIndex) => {
                        const ocupado = estaOcupado(fecha, slot.inicio, slot.fin);
                        const pasado = fecha.isBefore(moment(), 'day');
                        const reservaOcupada = obtenerReservaOcupada(fecha, slot.inicio, slot.fin);
                        
                        return (
                          <button
                            key={slotIndex}
                            onClick={() => handleSlotClick(fecha, slot)}
                            disabled={pasado}
                            className={`
                              p-4 rounded-xl text-sm font-semibold transition-all duration-200
                              transform hover:scale-105 active:scale-95
                              shadow-md hover:shadow-lg
                              ${
                                ocupado
                                  ? 'bg-red-100 text-red-700 border-2 border-red-300 hover:bg-red-200 cursor-pointer'
                                  : pasado
                                  ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                                  : 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 border-2 border-green-300 hover:from-green-200 hover:to-emerald-200'
                              }
                            `}
                          >
                            <div className="font-bold text-base">{slot.inicio} - {slot.fin}</div>
                            <div className="text-xs mt-1 font-medium">S/.{slot.precio30min}</div>
                            {ocupado && reservaOcupada && (
                              <>
                                <div className="text-xs mt-1 text-red-600 font-bold">✗ Ocupado</div>
                                {reservaOcupada.usuario_nombre && (
                                  <div className="text-xs mt-1 text-red-700 font-semibold truncate" title={reservaOcupada.usuario_nombre}>
                                    {reservaOcupada.usuario_nombre}
                                  </div>
                                )}
                              </>
                            )}
                            {!ocupado && !pasado && (
                              <div className="text-xs mt-1 text-green-600 font-semibold">✓ Disponible</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Modal de Reserva */}
      {mostrarModalReserva && slotSeleccionado && canchaData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <FormCard
              title="Crear Reserva"
              subtitle={`Cancha: ${canchas.find(c => c.id === canchaSeleccionada)?.nombre || ''} - ${moment(slotSeleccionado.fecha).format('DD/MM/YYYY')} ${slotSeleccionado.slot.inicio} - ${slotSeleccionado.slot.fin}`}
              onSubmit={handleReservaSubmit}
              onCancel={() => {
                setMostrarModalReserva(false);
                setSlotSeleccionado(null);
                setFormReserva({
                  fecha: '',
                  hora_inicio: '',
                  hora_fin: '',
                  duracion: '30',
                  notas: ''
                });
              }}
              submitLabel={`Reservar (S/.${calcularPrecio(formReserva.duracion, formReserva.hora_inicio).toFixed(2)})`}
              cancelLabel="Cancelar"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <FormInput
                  label="Hora Inicio"
                  type="time"
                  value={formReserva.hora_inicio}
                  onChange={(e) => setFormReserva({ ...formReserva, hora_inicio: e.target.value })}
                  required
                  icon="🕐"
                />

                <FormSelect
                  label="Duración"
                  value={formReserva.duracion}
                  onChange={(e) => setFormReserva({ ...formReserva, duracion: e.target.value })}
                  options={[
                    { value: '30', label: '30 minutos' },
                    { value: '60', label: '1 hora' },
                    { value: '90', label: '1 hora 30 minutos' },
                    { value: '120', label: '2 horas' },
                    { value: '150', label: '2 horas 30 minutos' },
                    { value: '180', label: '3 horas' }
                  ]}
                  icon="⏱️"
                />
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Hora Fin:</strong> {calcularHoraFin(formReserva.hora_inicio, formReserva.duracion)}
                </p>
                <p className="text-lg font-bold text-green-700 mt-2">
                  Costo Calculado: S/.{calcularPrecio(formReserva.duracion, formReserva.hora_inicio).toFixed(2)}
                </p>
              </div>

              <FormTextarea
                label="Notas (opcional)"
                value={formReserva.notas}
                onChange={(e) => setFormReserva({ ...formReserva, notas: e.target.value })}
                placeholder="Agrega alguna nota sobre la reserva..."
                icon="📝"
              />
            </FormCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default Horarios;

