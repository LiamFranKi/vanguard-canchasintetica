import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment';
import swalConfig from '../utils/swalConfig';
import Button from '../components/ui/Button';
import FormSelect from '../components/ui/FormSelect';

const Dashboard = () => {
  const navigate = useNavigate();
  const [canchas, setCanchas] = useState([]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
  const [semanaActual, setSemanaActual] = useState(moment().startOf('week').add(1, 'day')); // Lunes
  const [horariosSemana, setHorariosSemana] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCanchas();
  }, []);

  useEffect(() => {
    if (canchaSeleccionada) {
      loadHorariosSemana();
    }
  }, [canchaSeleccionada, semanaActual]);

  const loadCanchas = async () => {
    try {
      const response = await api.get('/canchas?activa=true');
      setCanchas(response.data);
      if (response.data.length > 0) {
        setCanchaSeleccionada(response.data[0].id);
      }
    } catch (error) {
      console.error('Error cargando canchas:', error);
    }
  };

  const loadHorariosSemana = async () => {
    if (!canchaSeleccionada) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/reservas/semanal/${canchaSeleccionada}`, {
        params: {
          fecha_inicio: semanaActual.format('YYYY-MM-DD')
        }
      });
      setHorariosSemana(response.data);
    } catch (error) {
      console.error('Error cargando horarios:', error);
      swalConfig.toastError('Error', 'Error al cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const cambiarSemana = (direccion) => {
    setSemanaActual(momento => momento.clone().add(direccion, 'weeks'));
  };

  const estaOcupado = (dia, horaInicio, horaFin) => {
    if (!horariosSemana) return false;
    const diaData = horariosSemana.dias.find(d => d.fecha === dia);
    if (!diaData) return false;
    
    return diaData.reservas.some(r => {
      const rInicio = moment(r.hora_inicio, 'HH:mm:ss');
      const rFin = moment(r.hora_fin, 'HH:mm:ss');
      const slotInicio = moment(horaInicio, 'HH:mm');
      const slotFin = moment(horaFin, 'HH:mm');
      
      return (slotInicio.isSameOrAfter(rInicio) && slotInicio.isBefore(rFin)) ||
             (slotFin.isAfter(rInicio) && slotFin.isSameOrBefore(rFin)) ||
             (slotInicio.isBefore(rInicio) && slotFin.isAfter(rFin));
    });
  };

  const handleReservar = (dia, horaInicio, horaFin) => {
    if (estaOcupado(dia, horaInicio, horaFin)) {
      swalConfig.toastError('Horario Ocupado', 'Este horario ya está reservado');
      return;
    }

    navigate('/app/reservas/nueva', {
      state: {
        cancha_id: canchaSeleccionada,
        fecha: dia,
        hora_inicio: horaInicio,
        hora_fin: horaFin
      }
    });
  };

  const generarSlots = (horarios) => {
    const slots = [];
    horarios.forEach(horario => {
      const inicio = moment(horario.hora_inicio, 'HH:mm:ss');
      const fin = moment(horario.hora_fin, 'HH:mm:ss');
      
      let current = inicio.clone();
      while (current.isBefore(fin)) {
        const slotInicio = current.format('HH:mm');
        const slotFin = current.add(1, 'hour').format('HH:mm');
        slots.push({
          inicio: slotInicio,
          fin: slotFin,
          costo: parseFloat(horario.costo)
        });
      }
    });
    return slots;
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="h-full flex flex-col">
      {/* Header con Selector de Cancha y Navegación de Semana */}
      <div className="bg-white border-b shadow-sm px-4 lg:px-8 py-4 sticky top-[73px] z-40">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Selector de Cancha */}
          <div className="w-full lg:w-auto lg:min-w-[300px]">
            <FormSelect
              label="Seleccionar Cancha"
              value={canchaSeleccionada || ''}
              onChange={(e) => setCanchaSeleccionada(parseInt(e.target.value))}
              options={canchas.map(c => ({ value: c.id, label: c.nombre }))}
              placeholder="Selecciona una cancha"
              icon="⚽"
              className="w-full"
            />
          </div>

          {/* Navegación de Semana */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-4">
            <Button
              variant="secondary"
              onClick={() => cambiarSemana(-1)}
              icon="←"
              size="sm"
            >
              Semana Anterior
            </Button>
            <div className="text-center">
              <h2 className="text-lg lg:text-xl font-bold text-gray-800">
                {semanaActual.format('DD/MM/YYYY')} - {semanaActual.clone().add(6, 'days').format('DD/MM/YYYY')}
              </h2>
              <p className="text-xs text-gray-600">Semana actual</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => cambiarSemana(1)}
              icon="→"
              size="sm"
            >
              Semana Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido del Horario - Ocupa toda la altura disponible */}
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-lg">Cargando horarios...</div>
          </div>
        ) : horariosSemana ? (
          <div className="max-w-full">
            {/* Grid de Días de la Semana */}
            <div className="grid grid-cols-7 gap-3 mb-6">
              {diasSemana.map((dia, index) => {
                const fechaDia = semanaActual.clone().add(index, 'days');
                const diaData = horariosSemana.dias.find(d => d.fecha === fechaDia.format('YYYY-MM-DD'));
                const slots = diaData ? generarSlots(diaData.horarios) : [];
                
                return (
                  <div key={index} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
                    {/* Header del Día */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 text-center">
                      <div className="font-bold text-sm lg:text-base">{dia}</div>
                      <div className="text-xs opacity-90">{fechaDia.format('DD/MM')}</div>
                    </div>
                    
                    {/* Slots del Día */}
                    <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {slots.length > 0 ? (
                        slots.map((slot, slotIndex) => {
                          const ocupado = estaOcupado(fechaDia.format('YYYY-MM-DD'), slot.inicio, slot.fin);
                          const pasado = fechaDia.isBefore(moment(), 'day');
                          return (
                            <button
                              key={slotIndex}
                              onClick={() => handleReservar(fechaDia.format('YYYY-MM-DD'), slot.inicio, slot.fin)}
                              disabled={ocupado || pasado}
                              className={`
                                w-full p-3 rounded-lg text-sm font-semibold transition-all duration-200
                                transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg
                                ${
                                  ocupado
                                    ? 'bg-red-100 text-red-700 border-2 border-red-300 cursor-not-allowed opacity-60'
                                    : pasado
                                    ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                                    : 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 border-2 border-green-300 hover:from-green-200 hover:to-emerald-200'
                                }
                              `}
                            >
                              <div className="font-bold text-xs lg:text-sm">{slot.inicio} - {slot.fin}</div>
                              <div className="text-xs mt-1 font-medium">S/.{slot.costo}</div>
                              {ocupado && (
                                <div className="text-xs mt-1 text-red-600 font-bold">✗ Ocupado</div>
                              )}
                              {!ocupado && !pasado && (
                                <div className="text-xs mt-1 text-green-600">✓ Disponible</div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center text-gray-400 text-xs py-4">Sin horarios</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">⚽</div>
              <div className="text-xl font-semibold">Selecciona una cancha para ver los horarios</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

