import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import moment from 'moment';
import swalConfig from '../../utils/swalConfig';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormSelect from '../../components/ui/FormSelect';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';
import FormTextarea from '../../components/ui/FormTextarea';

// Calcular el lunes de la semana actual de forma más robusta
const getLunesSemanaActual = () => {
  const hoy = moment().local();
  const diaSemana = hoy.day(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  // Si es domingo (0), retroceder 6 días para llegar al lunes anterior
  // Si es lunes (1), no retroceder (0 días)
  // Si es martes (2), retroceder 1 día
  // etc.
  const diasARetroceder = diaSemana === 0 ? 6 : diaSemana - 1;
  return hoy.clone().subtract(diasARetroceder, 'days').startOf('day');
};

const EmpleadoHorarios = () => {
  const [canchas, setCanchas] = useState([]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
  const [canchaData, setCanchaData] = useState(null);
  const [semanaActual, setSemanaActual] = useState(getLunesSemanaActual()); // Lunes
  const [reservasSemana, setReservasSemana] = useState({});
  const [loading, setLoading] = useState(false);
  const [mostrarModalReserva, setMostrarModalReserva] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [formReserva, setFormReserva] = useState({
    usuario_busqueda: '',
    usuario_id: null,
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    duracion: '30',
    notas: ''
  });
  const [usuarios, setUsuarios] = useState([]);
  
  // Estado para controlar qué días están expandidos (acordeón)
  const [diasExpandidos, setDiasExpandidos] = useState({});

  // Función para obtener el índice del día actual
  const getDiaActualIndex = () => {
    const hoy = moment().local().startOf('day');
    const inicioSemana = semanaActual.clone().local().startOf('day');
    const diff = hoy.diff(inicioSemana, 'days');
    return diff >= 0 && diff < 7 ? diff : -1;
  };

  // Función para toggle de días
  const toggleDia = (index) => {
    setDiasExpandidos(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    loadCanchas();
  }, []);

  useEffect(() => {
    if (canchaSeleccionada) {
      loadCanchaData();
      loadReservasSemana();
    }
  }, [canchaSeleccionada, semanaActual]);

  // Inicializar y actualizar días expandidos cuando cambia la semana o se carga la cancha
  // Solo el día actual estará expandido, los demás colapsados
  useEffect(() => {
    const hoy = moment().local().startOf('day');
    const inicioSemana = semanaActual.clone().local().startOf('day');
    
    // Calcular la diferencia en días
    const diff = hoy.diff(inicioSemana, 'days');
    const diaActual = diff >= 0 && diff < 7 ? diff : -1;
    
    // Si el día actual no está en esta semana, verificar si es porque la semana está mal calculada
    // Comparar directamente las fechas formateadas para evitar problemas de zona horaria
    const hoyFormato = hoy.format('YYYY-MM-DD');
    let diaActualCorrecto = -1;
    
    // Verificar cada día de la semana para encontrar el que coincide con hoy
    for (let i = 0; i < 7; i++) {
      const fechaDia = semanaActual.clone().add(i, 'days').local().startOf('day');
      if (fechaDia.format('YYYY-MM-DD') === hoyFormato) {
        diaActualCorrecto = i;
        break;
      }
    }
    
    // Resetear todos los días a colapsados y solo expandir el día actual
    const nuevosExpandidos = {};
    if (diaActualCorrecto >= 0) {
      nuevosExpandidos[diaActualCorrecto] = true;
    }
    setDiasExpandidos(nuevosExpandidos);
  }, [semanaActual, canchaSeleccionada]);

  useEffect(() => {
    // Si ya hay un usuario seleccionado y el texto tiene el formato "DNI - Nombre", no buscar de nuevo
    if (formReserva.usuario_id && formReserva.usuario_busqueda.includes(' - ')) {
      return;
    }
    
    if (formReserva.usuario_busqueda && formReserva.usuario_busqueda.length >= 2) {
      buscarUsuario();
    } else {
      setUsuarios([]);
      if (!formReserva.usuario_id) {
        setFormReserva(prev => ({ ...prev, usuario_id: null }));
      }
    }
  }, [formReserva.usuario_busqueda]);

  const loadCanchas = async () => {
    try {
      // El backend ya filtra automáticamente para empleados (solo canchas asignadas)
      const response = await api.get('/canchas?activa=true');
      setCanchas(response.data);
      if (response.data.length > 0) {
        setCanchaSeleccionada(response.data[0].id);
      }
    } catch (error) {
      console.error('Error cargando canchas:', error);
    }
  };

  const loadCanchaData = async () => {
    try {
      const response = await api.get(`/canchas/${canchaSeleccionada}`);
      setCanchaData(response.data);
    } catch (error) {
      console.error('Error cargando datos de cancha:', error);
    }
  };

  const loadReservasSemana = async () => {
    if (!canchaSeleccionada) return;
    
    setLoading(true);
    try {
      const fechaInicio = semanaActual.format('YYYY-MM-DD');
      const fechaFin = semanaActual.clone().add(6, 'days').format('YYYY-MM-DD');
      
      const response = await api.get(`/reservas`, {
        params: {
          cancha_id: canchaSeleccionada,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        }
      });

      // Organizar reservas por fecha
      const reservasPorFecha = {};
      response.data.forEach(reserva => {
        const fecha = moment(reserva.fecha).format('YYYY-MM-DD');
        if (!reservasPorFecha[fecha]) {
          reservasPorFecha[fecha] = [];
        }
        reservasPorFecha[fecha].push(reserva);
      });

      setReservasSemana(reservasPorFecha);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarUsuario = async () => {
    if (formReserva.usuario_busqueda.length < 2) {
      setUsuarios([]);
      setFormReserva(prev => ({ ...prev, usuario_id: null }));
      return;
    }
    
    let textoBusqueda = formReserva.usuario_busqueda.trim();
    if (textoBusqueda.includes(' - ')) {
      textoBusqueda = textoBusqueda.split(' - ')[0].trim();
    }
    
    if (textoBusqueda.length < 2) {
      setUsuarios([]);
      return;
    }
    
    try {
      const response = await api.get(`/users?search=${encodeURIComponent(textoBusqueda)}`);
      const usuariosEncontrados = response.data || [];
      setUsuarios(usuariosEncontrados);
      
      if (usuariosEncontrados.length === 1) {
        const usuario = usuariosEncontrados[0];
        const busqueda = textoBusqueda.toLowerCase().trim();
        const dniMatch = usuario.dni.toLowerCase() === busqueda;
        const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.toLowerCase();
        const nombreMatch = nombreCompleto.includes(busqueda) || busqueda.includes(usuario.dni.toLowerCase());
        
        if (dniMatch || nombreMatch) {
          setFormReserva(prev => ({
            ...prev,
            usuario_id: usuario.id,
            usuario_busqueda: `${usuario.dni} - ${usuario.nombre} ${usuario.apellido}`
          }));
        } else {
          setFormReserva(prev => ({ ...prev, usuario_id: null }));
        }
      } else {
        setFormReserva(prev => ({ ...prev, usuario_id: null }));
      }
    } catch (error) {
      console.error('Error buscando usuario:', error);
      setUsuarios([]);
      setFormReserva(prev => ({ ...prev, usuario_id: null }));
    }
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
      
      const precio30min = parseFloat(canchaData.precio_30min || 25);
      const precio1hora = parseFloat(canchaData.precio_1hora || 50);
      
      slots.push({
        inicio,
        fin,
        precio30min,
        precio1hora
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

  const handleSlotClick = (fecha, slot) => {
    const reservaOcupada = obtenerReservaOcupada(fecha, slot.inicio, slot.fin);
    
    if (reservaOcupada) {
      // Si está ocupado, mostrar opciones de editar
      setReservaSeleccionada(reservaOcupada);
      setSlotSeleccionado({ fecha, slot });
      setFormReserva({
        usuario_busqueda: `${reservaOcupada.usuario_dni || ''} - ${reservaOcupada.usuario_nombre || ''}`,
        usuario_id: reservaOcupada.usuario_id,
        fecha: moment(fecha).format('YYYY-MM-DD'),
        hora_inicio: reservaOcupada.hora_inicio.substring(0, 5),
        hora_fin: reservaOcupada.hora_fin.substring(0, 5),
        duracion: moment(reservaOcupada.hora_fin, 'HH:mm:ss').diff(moment(reservaOcupada.hora_inicio, 'HH:mm:ss'), 'minutes').toString(),
        notas: reservaOcupada.notas || ''
      });
      setMostrarModalEditar(true);
      return;
    }

    // Si está disponible, crear nueva reserva
    const fechaStr = moment(fecha).format('YYYY-MM-DD');
    setSlotSeleccionado({ fecha, slot });
    setReservaSeleccionada(null);
    setFormReserva({
      usuario_busqueda: '',
      usuario_id: null,
      fecha: fechaStr,
      hora_inicio: slot.inicio,
      hora_fin: slot.fin,
      duracion: '30',
      notas: ''
    });
    setMostrarModalReserva(true);
  };

  const calcularHoraFin = (horaInicio, duracion) => {
    const inicio = moment(horaInicio, 'HH:mm');
    return inicio.clone().add(parseInt(duracion), 'minutes').format('HH:mm');
  };

  const calcularDuracion = () => {
    if (!formReserva.hora_inicio || !formReserva.hora_fin) return 0;
    const inicio = moment(formReserva.hora_inicio, 'HH:mm');
    const fin = moment(formReserva.hora_fin, 'HH:mm');
    return fin.diff(inicio, 'minutes');
  };

  const calcularPrecio = (duracion) => {
    if (!canchaData) return 0;
    
    const minutos = typeof duracion === 'string' ? parseInt(duracion) : duracion;
    
    const precio30min = parseFloat(canchaData.precio_30min || 25);
    const precio1hora = parseFloat(canchaData.precio_1hora || 50);
    
    if (minutos <= 30) return precio30min;
    if (minutos <= 60) return precio1hora;
    if (minutos <= 90) return precio1hora + precio30min;
    if (minutos <= 120) return precio1hora * 2;
    
    return (precio1hora / 60) * minutos;
  };

  const handleReservaSubmit = async (e) => {
    e.preventDefault();
    
    if (!formReserva.usuario_id) {
      if (formReserva.usuario_busqueda.length === 0) {
        swalConfig.toastError('Error', 'Debes buscar y seleccionar un usuario');
      } else if (usuarios.length === 0) {
        swalConfig.toastError('Error', 'No se encontraron usuarios. Verifica el DNI, nombre o apellido e intenta nuevamente');
      } else {
        swalConfig.toastError('Error', 'Por favor, selecciona un usuario de la lista de resultados haciendo clic en él');
      }
      return;
    }

    let usuarioFinal = usuarios.find(u => u.id === formReserva.usuario_id);
    
    if (!usuarioFinal && formReserva.usuario_busqueda) {
      try {
        const response = await api.get(`/users?search=${encodeURIComponent(formReserva.usuario_busqueda)}`);
        usuarioFinal = response.data?.find(u => u.id === formReserva.usuario_id);
      } catch (error) {
        console.error('Error buscando usuario:', error);
      }
    }

    if (!usuarioFinal) {
      swalConfig.toastError('Error', 'Usuario no válido. Por favor, busca y selecciona un usuario de la lista');
      return;
    }

    const horaFinCalculada = calcularHoraFin(formReserva.hora_inicio, formReserva.duracion);
    const precio = calcularPrecio(formReserva.duracion);

    try {
      if (reservaSeleccionada) {
        // Editar reserva existente
        await api.put(`/reservas/${reservaSeleccionada.id}`, {
          hora_inicio: formReserva.hora_inicio,
          hora_fin: horaFinCalculada,
          notas: formReserva.notas
        });
        swalConfig.toastSuccess('¡Reserva Actualizada!', `Reserva actualizada exitosamente. Nuevo costo: S/.${precio.toFixed(2)}`);
        setMostrarModalEditar(false);
      } else {
        // Crear nueva reserva
        await api.post('/reservas', {
          cancha_id: canchaSeleccionada,
          usuario_id: usuarioFinal.id,
          fecha: formReserva.fecha,
          hora_inicio: formReserva.hora_inicio,
          hora_fin: horaFinCalculada,
          notas: formReserva.notas
        });
        swalConfig.toastSuccess('¡Reserva Creada!', `Reserva creada exitosamente. Costo: S/.${precio.toFixed(2)}`);
        setMostrarModalReserva(false);
      }
      
      setSlotSeleccionado(null);
      setReservaSeleccionada(null);
      setFormReserva({
        usuario_busqueda: '',
        usuario_id: null,
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        duracion: '30',
        notas: ''
      });
      loadReservasSemana();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || `Error al ${reservaSeleccionada ? 'actualizar' : 'crear'} la reserva`);
    }
  };

  const handleEliminarReserva = async () => {
    if (!reservaSeleccionada) return;

    const result = await swalConfig.confirm(
      '¿Cancelar reserva?',
      'Esta acción cancelará la reserva seleccionada.',
      {
        confirmText: 'Sí, cancelar',
        confirmColor: '#ef4444',
        cancelText: 'No, mantener'
      }
    );

    if (result.isConfirmed) {
      try {
        await api.put(`/reservas/${reservaSeleccionada.id}/cancelar`);
        swalConfig.toastSuccess('Reserva Cancelada', 'La reserva se ha cancelado correctamente');
        setMostrarModalEditar(false);
        setSlotSeleccionado(null);
        setReservaSeleccionada(null);
        setFormReserva({
          usuario_busqueda: '',
          usuario_id: null,
          fecha: '',
          hora_inicio: '',
          hora_fin: '',
          duracion: '30',
          notas: ''
        });
        loadReservasSemana();
      } catch (error) {
        swalConfig.toastError('Error', error.response?.data?.message || 'Error al cancelar la reserva');
      }
    }
  };

  const cambiarSemana = (direccion) => {
    setSemanaActual(semanaActual.clone().add(direccion, 'weeks'));
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Horarios y Reservas</h1>
        <p className="text-gray-600">Gestiona los horarios y crea reservas para las canchas asignadas</p>
      </div>

      <div className="mb-6">
        <FormSelect
          label="Seleccionar Cancha"
          value={canchaSeleccionada || ''}
          onChange={(e) => setCanchaSeleccionada(parseInt(e.target.value))}
          options={canchas.map(c => ({ value: c.id, label: c.nombre }))}
          placeholder="Selecciona una cancha"
          icon="⚽"
          className="w-full md:w-80"
        />
      </div>

      {canchaData && (
        <Card className="mb-6 p-4 bg-green-50 border border-green-200">
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Horario:</span>{' '}
              <span className="text-gray-600">
                {canchaData.hora_inicio_atencion?.substring(0, 5) || '08:00'} - {canchaData.hora_fin_atencion?.substring(0, 5) || '23:00'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">30 min:</span>{' '}
              <span className="text-green-600 font-bold">S/.{canchaData.precio_30min || 25}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">1 hora:</span>{' '}
              <span className="text-green-600 font-bold">S/.{canchaData.precio_1hora || 50}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Capacidad:</span>{' '}
              <span className="text-gray-600">{canchaData.capacidad} jugadores</span>
            </div>
          </div>
        </Card>
      )}

      {/* Navegación de Semana */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="secondary"
          onClick={() => cambiarSemana(-1)}
          icon="←"
        >
          Semana Anterior
        </Button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">
            Semana del {semanaActual.format('DD/MM/YYYY')} al {semanaActual.clone().add(6, 'days').format('DD/MM/YYYY')}
          </h2>
          <p className="text-sm text-gray-600">Lunes a Domingo</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => cambiarSemana(1)}
          icon="→"
        >
          Semana Siguiente
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Cargando horarios...</div>
        </div>
      ) : canchaData ? (
        <div className="space-y-6">
          {diasSemana.map((dia, index) => {
            const fecha = semanaActual.clone().add(index, 'days');
            const slots = generarSlots(fecha);
            const estaExpandido = diasExpandidos[index] === true; // Solo true si está explícitamente expandido
            
            return (
              <Card key={index} className="overflow-hidden">
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
                          {ocupado && (() => {
                            const reserva = obtenerReservaOcupada(fecha, slot.inicio, slot.fin);
                            return (
                              <>
                                <div className="text-xs mt-1 text-red-600 font-bold">✗ Ocupado</div>
                                {reserva && reserva.usuario_nombre && (
                                  <div className="text-xs mt-1 text-red-700 font-semibold truncate" title={reserva.usuario_nombre}>
                                    {reserva.usuario_nombre}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {!ocupado && !pasado && (
                            <div className="text-xs mt-1 text-green-600">✓ Disponible</div>
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
      ) : (
        <Card className="text-center py-12">
          <div className="text-gray-500">Selecciona una cancha para ver los horarios</div>
        </Card>
      )}

      {/* Modal de Reserva */}
      {mostrarModalReserva && slotSeleccionado && (
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
                  usuario_busqueda: '',
                  usuario_id: null,
                  fecha: '',
                  hora_inicio: '',
                  hora_fin: '',
                  duracion: '30',
                  notas: ''
                });
              }}
              submitLabel={`Reservar (S/.${calcularPrecio(formReserva.duracion).toFixed(2)})`}
              cancelLabel="Cancelar"
            >
              <FormInput
                label="Buscar Usuario"
                type="text"
                value={formReserva.usuario_busqueda}
                onChange={(e) => {
                  const nuevoValor = e.target.value;
                  if (!nuevoValor || !nuevoValor.includes(' - ') || nuevoValor !== formReserva.usuario_busqueda) {
                    setFormReserva({ ...formReserva, usuario_busqueda: nuevoValor, usuario_id: null });
                  }
                }}
                placeholder="Buscar por DNI, nombre o apellido..."
                required
                icon="🔍"
              />

              {usuarios.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} encontrado{usuarios.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {usuarios.map(usuario => (
                      <button
                        key={usuario.id}
                        type="button"
                        onClick={() => setFormReserva({ 
                          ...formReserva, 
                          usuario_id: usuario.id,
                          usuario_busqueda: `${usuario.dni} - ${usuario.nombre} ${usuario.apellido}`
                        })}
                        className={`w-full text-left p-3 bg-white rounded-lg hover:bg-blue-100 transition border-2 ${
                          formReserva.usuario_id === usuario.id ? 'border-blue-500 bg-blue-50' : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-800">
                              {usuario.nombre} {usuario.apellido}
                            </div>
                            <div className="text-sm text-gray-600">
                              DNI: {usuario.dni}
                            </div>
                            {usuario.email && (
                              <div className="text-xs text-gray-500">
                                {usuario.email}
                              </div>
                            )}
                          </div>
                          {formReserva.usuario_id === usuario.id && (
                            <span className="text-green-600 text-xl">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formReserva.usuario_busqueda.length >= 2 && usuarios.length === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-semibold">
                    ⚠️ No se encontraron usuarios
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Intenta buscar por DNI, nombre o apellido. Asegúrate de escribir correctamente.
                  </p>
                </div>
              )}

              {formReserva.usuario_id && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-semibold flex items-center">
                    <span className="mr-2">✓</span>
                    Usuario seleccionado correctamente
                  </p>
                </div>
              )}

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
                  Costo Total: S/.{calcularPrecio(formReserva.duracion).toFixed(2)}
                </p>
              </div>

              <FormInput
                label="Notas (opcional)"
                type="text"
                value={formReserva.notas}
                onChange={(e) => setFormReserva({ ...formReserva, notas: e.target.value })}
                placeholder="Agrega alguna nota sobre la reserva..."
                icon="📝"
              />
            </FormCard>
          </div>
        </div>
      )}

      {/* Modal de Editar Reserva */}
      {mostrarModalEditar && reservaSeleccionada && slotSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <FormCard
              title="Editar Reserva"
              subtitle={`Cancha: ${canchas.find(c => c.id === canchaSeleccionada)?.nombre || ''} - ${moment(slotSeleccionado.fecha).format('DD/MM/YYYY')} ${reservaSeleccionada.hora_inicio.substring(0, 5)} - ${reservaSeleccionada.hora_fin.substring(0, 5)}`}
              onSubmit={handleReservaSubmit}
              onCancel={() => {
                setMostrarModalEditar(false);
                setSlotSeleccionado(null);
                setReservaSeleccionada(null);
                setFormReserva({
                  usuario_busqueda: '',
                  usuario_id: null,
                  fecha: '',
                  hora_inicio: '',
                  hora_fin: '',
                  duracion: '30',
                  notas: ''
                });
              }}
              submitLabel={`Guardar Cambios (Nuevo costo: S/.${calcularPrecio(calcularDuracion()).toFixed(2)})`}
              cancelLabel="Cancelar"
            >
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Usuario:</strong> {reservaSeleccionada.usuario_nombre} ({reservaSeleccionada.usuario_dni || 'N/A'})
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Estado:</strong> <span className="capitalize">{reservaSeleccionada.estado}</span>
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Costo Actual:</strong> S/.{parseFloat(reservaSeleccionada.costo_total).toFixed(2)}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormInput
                  label="Hora Inicio"
                  type="time"
                  value={formReserva.hora_inicio}
                  onChange={(e) => setFormReserva({ ...formReserva, hora_inicio: e.target.value })}
                  required
                  icon="🕐"
                />
                <div>
                  <FormInput
                    label="Hora Fin"
                    type="time"
                    value={formReserva.hora_fin}
                    onChange={(e) => setFormReserva({ ...formReserva, hora_fin: e.target.value })}
                    required
                    icon="🕐"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const inicio = moment(formReserva.hora_inicio, 'HH:mm');
                        const nuevaFin = inicio.clone().subtract(30, 'minutes');
                        if (nuevaFin.isAfter(moment(formReserva.hora_inicio, 'HH:mm'))) {
                          setFormReserva({ ...formReserva, hora_fin: nuevaFin.format('HH:mm') });
                        }
                      }}
                      disabled={!formReserva.hora_inicio || !formReserva.hora_fin}
                      className="text-xs"
                    >
                      -30 min
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const inicio = moment(formReserva.hora_inicio, 'HH:mm');
                        const nuevaFin = inicio.clone().add(30, 'minutes');
                        setFormReserva({ ...formReserva, hora_fin: nuevaFin.format('HH:mm') });
                      }}
                      disabled={!formReserva.hora_inicio}
                      className="text-xs"
                    >
                      +30 min
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-sm text-green-800">
                  <strong>Duración:</strong> {calcularDuracion()} minutos ({Math.floor(calcularDuracion() / 60)}h {calcularDuracion() % 60}m)
                </p>
                <p className="text-lg font-bold text-green-700 mt-2">
                  <strong>Costo Actual:</strong> S/.{parseFloat(reservaSeleccionada.costo_total).toFixed(2)} → <strong>Nuevo Costo:</strong> S/.{calcularPrecio(calcularDuracion()).toFixed(2)}
                </p>
                {calcularPrecio(calcularDuracion()) < parseFloat(reservaSeleccionada.costo_total) && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Se reducirá el costo en S/.{(parseFloat(reservaSeleccionada.costo_total) - calcularPrecio(calcularDuracion())).toFixed(2)}
                  </p>
                )}
                {calcularPrecio(calcularDuracion()) > parseFloat(reservaSeleccionada.costo_total) && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠ Se incrementará el costo en S/.{(calcularPrecio(calcularDuracion()) - parseFloat(reservaSeleccionada.costo_total)).toFixed(2)}
                  </p>
                )}
              </div>

              <FormTextarea
                label="Notas (opcional)"
                value={formReserva.notas}
                onChange={(e) => setFormReserva({ ...formReserva, notas: e.target.value })}
                placeholder="Notas sobre la reserva..."
                rows="3"
                icon="📝"
              />

              <div className="mt-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleEliminarReserva}
                  className="w-full"
                  icon="🗑️"
                >
                  Cancelar Reserva (Liberar Tiempo)
                </Button>
              </div>
            </FormCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpleadoHorarios;
