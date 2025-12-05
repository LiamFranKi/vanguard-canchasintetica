import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import moment from 'moment';
import swalConfig from '../../utils/swalConfig';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormSelect from '../../components/ui/FormSelect';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';
import FormTextarea from '../../components/ui/FormTextarea';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';

const AdminReservas = () => {
  const { user } = useAuth();
  const { getConfig } = useConfig();
  const [reservas, setReservas] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCancha, setFiltroCancha] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('activas'); // 'activas' o 'pasadas'
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 20;
  const [editandoReserva, setEditandoReserva] = useState(null);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [reservaParaPago, setReservaParaPago] = useState(null);
  const [formData, setFormData] = useState({
    hora_inicio: '',
    hora_fin: '',
    notas: ''
  });
  const [formPago, setFormPago] = useState({
    metodo_pago: 'efectivo',
    comprobante: null
  });
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [mostrarRecibo, setMostrarRecibo] = useState(false);
  const [reciboUrl, setReciboUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadCanchas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReservas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCancha, filtroEstado, filtroTipo]);

  // Limpiar cámara al desmontar el componente
  useEffect(() => {
    return () => {
      detenerCamara();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCanchas = async () => {
    try {
      const response = await api.get('/canchas');
      setCanchas(response.data);
    } catch (error) {
      console.error('Error cargando canchas:', error);
    }
  };

  const loadReservas = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Filtro por cancha - solo agregar si NO es vacío
      if (filtroCancha && filtroCancha !== '') {
        const canchaId = parseInt(filtroCancha);
        if (!isNaN(canchaId)) {
          params.cancha_id = canchaId;
        }
      }
      
      // Filtro por estado - SOLO agregar si tiene un valor válido (no es "Todos los estados")
      // IMPORTANTE: Si filtroEstado es '' (cadena vacía), NO agregamos params.estado
      // Esto hace que el backend devuelva TODAS las reservas sin filtrar por estado
      if (filtroEstado && filtroEstado !== '' && filtroEstado !== null && filtroEstado !== undefined) {
        // Asegurarse de que es una cadena válida
        const estadoStr = String(filtroEstado).trim();
        if (estadoStr !== '') {
          if (estadoStr === 'pagada') {
            params.estado = 'confirmada';
          } else {
            params.estado = estadoStr;
          }
        }
      }
      // Si filtroEstado es '' (Todos los estados), params.estado NO existe
      // y el backend NO filtrará por estado, devolviendo TODAS las reservas
      
      const response = await api.get('/reservas', { params });
      let reservasFiltradas = Array.isArray(response.data) ? response.data : [];
      
      // Si el filtro es "pagada", filtrar solo las que tienen pago confirmado (estado completada)
      if (filtroEstado && String(filtroEstado).trim() === 'pagada') {
        reservasFiltradas = reservasFiltradas.filter(r => 
          r.estado === 'completada' && r.pago_id && r.pago_estado === 'confirmado'
        );
      }
      
      // Aplicar filtro de tipo (activas/pasadas) basado en la fecha
      const hoy = moment().startOf('day');
      const reservasConTipo = reservasFiltradas.map(r => {
        const fechaReserva = moment(r.fecha).startOf('day');
        const esPasada = fechaReserva.isBefore(hoy);
        return { ...r, esPasada };
      });

      if (filtroTipo === 'pasadas') {
        // Pasadas: todas las reservas anteriores a hoy (incluyendo canceladas)
        setReservas(reservasConTipo.filter(r => r.esPasada));
      } else {
        // Activas: todas las reservas de hoy o futuras (incluyendo canceladas)
        setReservas(reservasConTipo.filter(r => !r.esPasada));
      }
      
      setPaginaActual(1); // Reset a primera página al cambiar filtros
    } catch (error) {
      console.error('Error cargando reservas:', error);
      swalConfig.toastError('Error', 'No se pudieron cargar las reservas');
      setReservas([]);
    } finally {
      setLoading(false);
    }
  };

  // Paginación
  const totalPaginas = Math.ceil(reservas.length / itemsPorPagina);
  const inicioIndex = (paginaActual - 1) * itemsPorPagina;
  const finIndex = inicioIndex + itemsPorPagina;
  const reservasPaginadas = reservas.slice(inicioIndex, finIndex);

  const cambiarEstado = async (id, nuevoEstado) => {
    const result = await swalConfig.confirm(
      `¿Cambiar estado a "${nuevoEstado}"?`,
      `Estás a punto de cambiar el estado de la reserva.`,
      {
        confirmText: 'Sí, cambiar',
        confirmColor: nuevoEstado === 'confirmada' ? '#22c55e' : nuevoEstado === 'completada' ? '#3b82f6' : '#ef4444',
        cancelText: 'Cancelar',
      }
    );

    if (result.isConfirmed) {
      try {
        await api.put(`/reservas/${id}/estado`, { estado: nuevoEstado });
        swalConfig.toastSuccess('Estado Actualizado', `La reserva ha sido ${nuevoEstado} correctamente`);
        loadReservas();
      } catch (error) {
        swalConfig.toastError('Error', error.response?.data?.message || 'Error al actualizar el estado');
      }
    }
  };

  const handleEditar = (reserva) => {
    setEditandoReserva(reserva.id);
    setFormData({
      hora_inicio: reserva.hora_inicio.substring(0, 5), // Formato HH:mm
      hora_fin: reserva.hora_fin.substring(0, 5),
      notas: reserva.notas || ''
    });
  };

  const calcularDuracion = () => {
    if (!formData.hora_inicio || !formData.hora_fin) return 0;
    const inicio = moment(formData.hora_inicio, 'HH:mm');
    const fin = moment(formData.hora_fin, 'HH:mm');
    return fin.diff(inicio, 'minutes');
  };

  const calcularNuevoCosto = (reserva) => {
    const duracionMinutos = calcularDuracion();
    if (duracionMinutos <= 0) {
      // Asegurarse de que siempre devuelva un número
      const costoActual = parseFloat(reserva.costo_total) || 0;
      return costoActual;
    }

    // Usar los precios de la cancha si están disponibles, sino valores por defecto
    // Asegurarse de que siempre sean números
    const precio30min = parseFloat(reserva.precio_30min) || 25;
    const precio1hora = parseFloat(reserva.precio_1hora) || 50;

    let nuevoCosto = 0;
    if (duracionMinutos <= 30) {
      nuevoCosto = precio30min;
    } else if (duracionMinutos <= 60) {
      nuevoCosto = precio1hora;
    } else if (duracionMinutos <= 90) {
      nuevoCosto = precio1hora + precio30min;
    } else if (duracionMinutos <= 120) {
      nuevoCosto = precio1hora * 2;
    } else {
      const horas = duracionMinutos / 60;
      nuevoCosto = precio1hora * horas;
    }
    
    // Asegurarse de que siempre devuelva un número válido
    const costoFinal = parseFloat(nuevoCosto) || 0;
    return isNaN(costoFinal) ? 0 : costoFinal;
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    
    if (!editandoReserva) return;

    const reserva = reservas.find(r => r.id === editandoReserva);
    if (!reserva) return;

    try {
      await api.put(`/reservas/${editandoReserva}`, {
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        notas: formData.notas
      });

      swalConfig.toastSuccess('Reserva Actualizada', 'La reserva se ha actualizado correctamente. El costo se ha recalculado automáticamente.');
      
      setEditandoReserva(null);
      setFormData({ hora_inicio: '', hora_fin: '', notas: '' });
      loadReservas();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al actualizar la reserva');
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoReserva(null);
    setFormData({ hora_inicio: '', hora_fin: '', notas: '' });
  };

  const calcularDiasRestantes = (fechaCreacion) => {
    const diasMax = parseInt(getConfig('dias_max_pago') || 3);
    const fechaLimite = moment(fechaCreacion).add(diasMax, 'days');
    const diasRestantes = fechaLimite.diff(moment(), 'days');
    return diasRestantes;
  };

  const handleCrearPago = (reserva) => {
    setReservaParaPago(reserva);
    setFormPago({
      metodo_pago: 'efectivo',
      referencia_pago: '',
      comprobante: null
    });
    setMostrarModalPago(true);
  };

  const handleFileChangePago = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormPago({ ...formPago, comprobante: e.target.files[0] });
    }
  };

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Cámara trasera en móviles
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setMostrarCamara(true);
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      swalConfig.toastError('Error', 'No se pudo acceder a la cámara. Por favor, permite el acceso a la cámara.');
    }
  };

  const capturarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `comprobante-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setFormPago({ ...formPago, comprobante: file });
          detenerCamara();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const detenerCamara = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setMostrarCamara(false);
  };

  const verRecibo = (comprobante) => {
    if (comprobante) {
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${comprobante}`;
      setReciboUrl(url);
      setMostrarRecibo(true);
    }
  };

  const handleEliminarReserva = async (id) => {
    const result = await swalConfig.confirm(
      '¿Eliminar reserva cancelada?',
      'Esta acción eliminará permanentemente la reserva y sus pagos asociados.',
      {
        confirmText: 'Sí, eliminar',
        confirmColor: '#ef4444',
        cancelText: 'Cancelar'
      }
    );

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/reservas/${id}`);
      swalConfig.toastSuccess('Reserva eliminada', 'La reserva se ha eliminado correctamente');
      loadReservas();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al eliminar la reserva');
    }
  };

  const handleSubmitPago = async (e) => {
    e.preventDefault();
    
    if (!reservaParaPago) return;

    // Validar que Yape y Transferencia tengan comprobante
    if ((formPago.metodo_pago === 'yape' || formPago.metodo_pago === 'transferencia') && !formPago.comprobante) {
      swalConfig.toastError('Error', 'Debes adjuntar el comprobante de pago');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('metodo_pago', formPago.metodo_pago);
    if (formPago.comprobante) {
      formDataToSend.append('comprobante', formPago.comprobante);
    }

    try {
      await api.post(`/reservas/${reservaParaPago.id}/pago`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      swalConfig.toastSuccess('¡Pago Registrado!', 'El pago se ha registrado correctamente');
      
      setMostrarModalPago(false);
      setReservaParaPago(null);
      setFormPago({
        metodo_pago: 'efectivo',
        comprobante: null
      });
      detenerCamara();
      loadReservas();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al crear el pago');
    }
  };

  const handleConfirmarPago = async (reservaId) => {
    const result = await swalConfig.confirm(
      '¿Confirmar pago?',
      'Esta acción confirmará el pago y la reserva asociada',
      {
        confirmText: 'Sí, confirmar',
        confirmColor: '#22c55e',
        cancelText: 'Cancelar'
      }
    );

    if (result.isConfirmed) {
      try {
        await api.put(`/reservas/${reservaId}/pago/confirmar`);
        swalConfig.toastSuccess('Pago Confirmado', 'El pago se ha confirmado correctamente');
        loadReservas();
      } catch (error) {
        swalConfig.toastError('Error', error.response?.data?.message || 'Error al confirmar el pago');
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

  return (
    <div>
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Gestión de Reservas</h1>
          <p className="text-gray-600">Administra todas las reservas del sistema</p>
        </div>
        <div className="flex gap-4 flex-wrap mb-4">
          <FormSelect
            value={filtroCancha}
            onChange={(e) => setFiltroCancha(e.target.value)}
            options={[
              { value: '', label: 'Todas las canchas' },
              ...canchas.map(cancha => ({
                value: cancha.id.toString(),
                label: cancha.nombre
              }))
            ]}
            className="w-64 mb-0"
          />
          <FormSelect
            value={filtroEstado || ''}
            onChange={(e) => setFiltroEstado(e.target.value)}
            placeholder="Seleccionar estado..."
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'pagada', label: 'Pagada' },
              { value: 'cancelada', label: 'Cancelada' }
            ]}
            className="w-64 mb-0"
          />
        </div>
        {/* Filtro de tipo de reservas */}
        <div className="flex gap-4">
          <Button
            variant={filtroTipo === 'activas' ? 'primary' : 'secondary'}
            onClick={() => setFiltroTipo('activas')}
            icon="📋"
          >
            Reservas Activas
          </Button>
          <Button
            variant={filtroTipo === 'pasadas' ? 'primary' : 'secondary'}
            onClick={() => setFiltroTipo('pasadas')}
            icon="📜"
          >
            Reservas Pasadas
          </Button>
        </div>
      </div>

      {editandoReserva && (() => {
        const reserva = reservas.find(r => r.id === editandoReserva);
        if (!reserva) return null;
        const nuevoCosto = calcularNuevoCosto(reserva);
        const duracionMinutos = calcularDuracion();
        const nuevoCostoNum = typeof nuevoCosto === 'number' ? nuevoCosto : parseFloat(nuevoCosto) || 0;
        
        return (
          <FormCard
            title="Editar Reserva"
            subtitle={`Cancha: ${reserva.cancha_nombre} - ${moment(reserva.fecha).format('DD/MM/YYYY')}`}
            onSubmit={handleGuardarEdicion}
            onCancel={handleCancelarEdicion}
            submitLabel={`Guardar Cambios (Nuevo costo: S/.${nuevoCostoNum.toFixed(2)})`}
            cancelLabel="Cancelar"
            className="mb-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
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

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                <strong>Duración:</strong> {duracionMinutos} minutos ({Math.floor(duracionMinutos / 60)}h {duracionMinutos % 60}m)
              </p>
              <p className="text-lg font-bold text-green-700 mt-2">
                <strong>Costo Actual:</strong> S/.{parseFloat(reserva.costo_total || 0).toFixed(2)} → <strong>Nuevo Costo:</strong> S/.{nuevoCostoNum.toFixed(2)}
              </p>
              {nuevoCostoNum < parseFloat(reserva.costo_total || 0) && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Se reducirá el costo en S/.{(parseFloat(reserva.costo_total || 0) - nuevoCostoNum).toFixed(2)}
                </p>
              )}
            </div>

            <FormTextarea
              label="Notas (opcional)"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Notas sobre la reserva..."
              rows="3"
              icon="📝"
            />
          </FormCard>
        );
      })()}

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                  <th className="px-6 py-4 text-center font-semibold">Usuario</th>
                  <th className="px-6 py-4 text-center font-semibold">Fecha y Horario</th>
                  <th className="px-6 py-4 text-center font-semibold">Costo</th>
                  <th className="px-6 py-4 text-center font-semibold">Pago</th>
                  <th className="px-6 py-4 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No se encontraron reservas
                    </td>
                  </tr>
                ) : (
                  reservasPaginadas.map((reserva) => (
                    <tr key={reserva.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold">{reserva.usuario_nombre}</span>
                          <span className="text-xs text-gray-500 mt-1">{reserva.cancha_nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold">{moment(reserva.fecha).format('DD/MM/YYYY')}</span>
                          <span className="text-xs text-gray-500 mt-1">{reserva.hora_inicio.substring(0, 5)} - {reserva.hora_fin.substring(0, 5)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-green-600 text-center">S/.{parseFloat(reserva.costo_total).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        {reserva.estado === 'cancelada' ? (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                            Cancelado
                          </span>
                        ) : reserva.pago_id ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                Pagado
                              </span>
                              {reserva.comprobante && (
                                <button
                                  onClick={() => verRecibo(reserva.comprobante)}
                                  className="text-green-600 hover:text-green-800 transition"
                                  title="Ver recibo"
                                >
                                  📄
                                </button>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 capitalize">{reserva.metodo_pago}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                              ⏳ Sin pago
                            </span>
                            {calcularDiasRestantes(reserva.created_at) >= 0 ? (
                              <span className="text-xs text-gray-600">
                                {calcularDiasRestantes(reserva.created_at)} días restantes
                              </span>
                            ) : (
                              <span className="text-xs text-red-600 font-bold">
                                ⚠️ Vencida
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center flex-wrap">
                          {/* Para Reservas Pasadas: Admin siempre puede Editar y Cancelar (excepto canceladas) */}
                          {reserva.estado !== 'cancelada' && (
                            <>
                              {/* Botón Editar - solo para pendientes o pasadas */}
                              {(
                                reserva.estado === 'pendiente' || 
                                (reserva.esPasada && reserva.estado !== 'cancelada')
                              ) && user?.rol === 'admin' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleEditar(reserva)}
                                  icon="✏️"
                                >
                                  Editar
                                </Button>
                              )}
                              
                              {/* Botón Cancelar - siempre visible para admin en reservas pasadas, o según lógica normal */}
                              {(reserva.esPasada || reserva.estado === 'pendiente' || (reserva.estado === 'completada' && reserva.pago_id)) && user?.rol === 'admin' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => cambiarEstado(reserva.id, 'cancelada')}
                                  icon="✕"
                                >
                                  Cancelar
                                </Button>
                              )}
                            </>
                          )}
                          
                          {/* Pendiente sin pago: Pagar (solo si no es pasada o es activa) */}
                          {reserva.estado === 'pendiente' && !reserva.pago_id && !reserva.esPasada && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleCrearPago(reserva)}
                              icon="💳"
                            >
                              Pagar
                            </Button>
                          )}
                          
                          {/* Pendiente con pago pendiente: Confirmar pago */}
                          {reserva.estado === 'pendiente' && reserva.pago_estado === 'pendiente' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleConfirmarPago(reserva.id)}
                              icon="✓"
                            >
                              Confirmar Pago
                            </Button>
                          )}
                          
                          {/* Completar: solo para confirmadas activas */}
                          {reserva.estado === 'confirmada' && !reserva.esPasada && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => cambiarEstado(reserva.id, 'completada')}
                              icon="✓"
                            >
                              Completar
                            </Button>
                          )}
                          
                          {/* Eliminar: solo para canceladas */}
                          {reserva.estado === 'cancelada' && user?.rol === 'admin' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleEliminarReserva(reserva.id)}
                              icon="🗑️"
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-600">
                Mostrando {inicioIndex + 1} a {Math.min(finIndex, reservas.length)} de {reservas.length} reservas
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  icon="←"
                >
                  Anterior
                </Button>
                <span className="px-4 py-2 text-sm font-semibold text-gray-700">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  icon="→"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Modal de Pago */}
      {mostrarModalPago && reservaParaPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <FormCard
              title="Pagar Reserva"
              subtitle={`Reserva: ${reservaParaPago.cancha_nombre} - ${moment(reservaParaPago.fecha).format('DD/MM/YYYY')} - S/.${reservaParaPago.costo_total}`}
              onSubmit={handleSubmitPago}
              onCancel={() => {
                detenerCamara();
                setMostrarModalPago(false);
                setReservaParaPago(null);
                setFormPago({
                  metodo_pago: 'efectivo',
                  comprobante: null
                });
              }}
              submitLabel="Pagar"
              cancelLabel="Cancelar"
            >
              <FormSelect
                label="Método de Pago"
                value={formPago.metodo_pago}
                onChange={(e) => {
                  setFormPago({ ...formPago, metodo_pago: e.target.value, comprobante: null });
                  detenerCamara();
                }}
                options={[
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'yape', label: 'Yape' },
                  { value: 'transferencia', label: 'Transferencia' }
                ]}
                required
                icon="💳"
              />

              {(formPago.metodo_pago === 'yape' || formPago.metodo_pago === 'transferencia') && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="mr-2">📄</span>Comprobante de Pago
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  
                  {!mostrarCamara ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChangePago}
                            className="hidden"
                            id="file-input"
                          />
                          <div className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100 transition-all text-center">
                            <span className="text-gray-600">📁 Seleccionar archivo</span>
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={iniciarCamara}
                          className="px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-semibold"
                        >
                          📷 Cámara
                        </button>
                      </div>
                      {formPago.comprobante && (
                        <p className="text-sm text-green-600 flex items-center">
                          <span className="mr-1">✅</span>
                          {formPago.comprobante.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative bg-black rounded-xl overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-auto max-h-64"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={capturarFoto}
                          className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-semibold"
                        >
                          📸 Capturar Foto
                        </button>
                        <button
                          type="button"
                          onClick={detenerCamara}
                          className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all font-semibold"
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Nota:</strong> El pago se confirmará automáticamente y la reserva pasará a estado "Confirmada".
                </p>
              </div>
            </FormCard>
          </div>
        </div>
      )}

      {/* Modal para ver recibo */}
      {mostrarRecibo && reciboUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Comprobante de Pago</h2>
                <button
                  onClick={() => {
                    setMostrarRecibo(false);
                    setReciboUrl(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex justify-center">
                {reciboUrl.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={reciboUrl}
                    className="w-full h-[70vh] border rounded-lg"
                    title="Comprobante PDF"
                  />
                ) : (
                  <img
                    src={reciboUrl}
                    alt="Comprobante de pago"
                    className="max-w-full h-auto rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReservas;

