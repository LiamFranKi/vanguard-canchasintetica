import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment';
import swalConfig from '../utils/swalConfig';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import FormSelect from '../components/ui/FormSelect';

const Horarios = () => {
  const [canchas, setCanchas] = useState([]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
  const [semanaActual, setSemanaActual] = useState(moment().startOf('week').add(1, 'day')); // Lunes
  const [horariosSemana, setHorariosSemana] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Horarios y Disponibilidad</h1>
        <p className="text-gray-600">Selecciona una cancha y fecha para hacer tu reserva</p>
        
        {/* Selector de Cancha */}
        <div className="mt-6">
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
              {semanaActual.format('DD/MM/YYYY')} - {semanaActual.clone().add(6, 'days').format('DD/MM/YYYY')}
            </h2>
            <p className="text-sm text-gray-600">Semana actual</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => cambiarSemana(1)}
            icon="→"
          >
            Semana Siguiente
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Cargando horarios...</div>
        </div>
      ) : horariosSemana ? (
        <Card>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-7 gap-2 p-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-t-xl">
                {diasSemana.map((dia, index) => {
                  const fechaDia = semanaActual.clone().add(index, 'days');
                  return (
                    <div key={index} className="text-center">
                      <div className="text-lg">{dia}</div>
                      <div className="text-sm opacity-90 font-normal">{fechaDia.format('DD/MM')}</div>
                    </div>
                  );
                })}
              </div>

            <div className="p-4">
              {horariosSemana.dias.map((dia, diaIndex) => {
                const slots = generarSlots(dia.horarios);
                return (
                  <div key={diaIndex} className="mb-4">
                    <h3 className="font-semibold mb-2 text-gray-700">
                      {moment(dia.fecha).format('dddd DD/MM')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {slots.map((slot, slotIndex) => {
                        const ocupado = estaOcupado(dia.fecha, slot.inicio, slot.fin);
                        const pasado = moment(dia.fecha).isBefore(moment(), 'day');
                        return (
                          <button
                            key={slotIndex}
                            onClick={() => handleReservar(dia.fecha, slot.inicio, slot.fin)}
                            disabled={ocupado || pasado}
                            className={`
                              p-4 rounded-xl text-sm font-semibold transition-all duration-200
                              transform hover:scale-105 active:scale-95
                              shadow-md hover:shadow-lg
                              ${
                                ocupado
                                  ? 'bg-red-100 text-red-700 border-2 border-red-300 cursor-not-allowed opacity-60'
                                  : pasado
                                  ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                                  : 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 border-2 border-green-300 hover:from-green-200 hover:to-emerald-200'
                              }
                            `}
                          >
                            <div className="font-bold">{slot.inicio} - {slot.fin}</div>
                            <div className="text-xs mt-1 font-medium">S/.{slot.costo}</div>
                            {ocupado && (
                              <div className="text-xs mt-1 text-red-600 font-bold">✗ Ocupado</div>
                            )}
                            {!ocupado && !pasado && (
                              <div className="text-xs mt-1 text-green-600">✓ Disponible</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Selecciona una cancha para ver los horarios
        </div>
      )}
    </div>
  );
};

export default Horarios;

