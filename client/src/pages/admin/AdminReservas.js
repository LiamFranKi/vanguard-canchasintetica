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
    notas: '',
    precio_manual_enabled: false,
    precio_manual: ''
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
        notas: reserva.notas || '',
        precio_manual_enabled: false,
        precio_manual: ''
      });
  };

  const calcularDuracion = () => {
    if (!formData.hora_inicio || !formData.hora_fin) return 0;
    const inicio = moment(formData.hora_inicio, 'HH:mm');
    const fin = moment(formData.hora_fin, 'HH:mm');
    return fin.diff(inicio, 'minutes');
  };

  const calcularNuevoCosto = (reserva) => {
    // Si el precio manual está habilitado, usar ese precio
    if (formData.precio_manual_enabled && formData.precio_manual) {
      const precioManual = parseFloat(formData.precio_manual);
      return isNaN(precioManual) ? 0 : precioManual;
    }

    const duracionMinutos = calcularDuracion();
    if (duracionMinutos <= 0) {
      // Asegurarse de que siempre devuelva un número
      const costoActual = parseFloat(reserva.costo_total) || 0;
      return costoActual;
    }

    // Determinar turno (día/noche) según la hora de inicio editada
    const horaLimite = moment(reserva.hora_limite_turno || '18:00', 'HH:mm');
    const horaInicioMoment = moment(formData.hora_inicio, 'HH:mm');
    const esTurnoNoche = horaInicioMoment.isSameOrAfter(horaLimite);

    // Obtener precios según el turno
    let precio30min, precio1hora;
    if (esTurnoNoche) {
      precio30min = parseFloat(reserva.precio_30min_noche || reserva.precio_30min || 35);
      precio1hora = parseFloat(reserva.precio_1hora_noche || reserva.precio_1hora || 70);
    } else {
      precio30min = parseFloat(reserva.precio_30min_dia || reserva.precio_30min || 25);
      precio1hora = parseFloat(reserva.precio_1hora_dia || reserva.precio_1hora || 50);
    }

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
      const nuevoCosto = calcularNuevoCosto(reserva);
      
      await api.put(`/reservas/${editandoReserva}`, {
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        notas: formData.notas,
        costo_total: nuevoCosto
      });

      swalConfig.toastSuccess('Reserva Actualizada', `La reserva se ha actualizado correctamente. Costo: S/.${nuevoCosto.toFixed(2)}`);
      
      setEditandoReserva(null);
      setFormData({ hora_inicio: '', hora_fin: '', notas: '', precio_manual_enabled: false, precio_manual: '' });
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

  const comprimirImagen = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      // Si es PDF, no comprimir
      if (file.type === 'application/pdf') {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar si es necesario
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }
              // Crear un nuevo File con el blob comprimido
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChangePago = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar que el archivo sea válido
      if (file.size === 0) {
        swalConfig.toastError('Error', 'El archivo está vacío. Por favor, intenta de nuevo.');
        e.target.value = '';
        return;
      }

      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        swalConfig.toastError('Error', 'Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP) o PDF.');
        e.target.value = '';
        return;
      }

      try {
        let fileToUse = file;

        // Si es una imagen (no PDF), comprimirla
        if (file.type !== 'application/pdf' && file.size > 1 * 1024 * 1024) {
          // Comprimir si es mayor a 1MB
          swalConfig.toastInfo('Comprimiendo...', 'Comprimiendo imagen para optimizar el tamaño');
          fileToUse = await comprimirImagen(file, 1920, 1920, 0.75);
          console.log(`Imagen comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUse.size / 1024 / 1024).toFixed(2)}MB`);
        }

        // Validar tamaño después de comprimir (5MB - debe coincidir con el servidor)
        if (fileToUse.size > 5 * 1024 * 1024) {
          swalConfig.toastError('Error', 'El archivo es demasiado grande incluso después de comprimir. Por favor, intenta con otra imagen.');
          e.target.value = '';
          return;
        }

        setFormPago({ ...formPago, comprobante: fileToUse });
        swalConfig.toastSuccess('Archivo listo', `Archivo "${fileToUse.name}" listo para subir (${(fileToUse.size / 1024 / 1024).toFixed(2)}MB)`);
      } catch (error) {
        console.error('Error procesando archivo:', error);
        swalConfig.toastError('Error', 'Error al procesar el archivo. Por favor, intenta de nuevo.');
        e.target.value = '';
      }
    }
  };

  const iniciarCamara = async () => {
    try {
      // Intentar primero con cámara trasera (environment)
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (envError) {
        // Si falla, intentar con cualquier cámara disponible
        console.log('Cámara trasera no disponible, usando cámara frontal:', envError);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      }
      
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        // Mostrar la cámara inmediatamente
        setMostrarCamara(true);
        
        // Asegurar que el video se reproduzca
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
          } catch (playError) {
            console.log('Error al reproducir video:', playError);
          }
        };
        
        // Intentar reproducir inmediatamente también
        videoRef.current.play().catch(err => {
          console.log('Error al reproducir video inmediatamente:', err);
        });
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      let errorMessage = 'No se pudo acceder a la cámara.';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración del navegador.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en el dispositivo.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      }
      swalConfig.toastError('Error de Cámara', errorMessage);
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
      const url = `${window.location.origin}${comprobante}`;
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

    // Validar el archivo antes de enviar
    if (formPago.comprobante) {
      if (formPago.comprobante.size === 0) {
        swalConfig.toastError('Error', 'El archivo está vacío. Por favor, selecciona otro archivo.');
        return;
      }
      if (formPago.comprobante.size > 5 * 1024 * 1024) {
        swalConfig.toastError('Error', 'El archivo es demasiado grande. El tamaño máximo es 5MB.');
        return;
      }
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
      console.error('Error completo al crear pago:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      
      let errorMessage = 'Error al crear el pago';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        errorMessage = error.response.data.errors.map(e => e.msg || e.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      swalConfig.toastError('Error', errorMessage);
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
      <div className="mb-4 sm:mb-6">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1">Gestión de Reservas</h1>
          <p className="text-sm sm:text-base text-gray-600">Administra todas las reservas del sistema</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
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
            className="w-full sm:w-48 md:w-56 lg:w-64 mb-0"
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
            className="w-full sm:w-48 md:w-56 lg:w-64 mb-0"
          />
        </div>
        {/* Filtro de tipo de reservas */}
        <div className="flex gap-2 sm:gap-4">
          <Button
            variant={filtroTipo === 'activas' ? 'primary' : 'secondary'}
            onClick={() => setFiltroTipo('activas')}
            icon="📋"
            className="flex-1 sm:flex-none text-sm sm:text-base"
          >
            Reservas Activas
          </Button>
          <Button
            variant={filtroTipo === 'pasadas' ? 'primary' : 'secondary'}
            onClick={() => setFiltroTipo('pasadas')}
            icon="📜"
            className="flex-1 sm:flex-none text-sm sm:text-base"
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
            submitLabel={`Guardar Cambios (Costo: S/.${formData.precio_manual_enabled && formData.precio_manual ? parseFloat(formData.precio_manual).toFixed(2) : nuevoCostoNum.toFixed(2)})`}
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
              <p className="text-sm text-green-800 mt-1">
                <strong>Costo Actual:</strong> S/.{parseFloat(reserva.costo_total || 0).toFixed(2)} → <strong>Costo Calculado:</strong> S/.{nuevoCostoNum.toFixed(2)}
              </p>
              {nuevoCostoNum < parseFloat(reserva.costo_total || 0) && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Se reducirá el costo en S/.{(parseFloat(reserva.costo_total || 0) - nuevoCostoNum).toFixed(2)}
                </p>
              )}
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.precio_manual_enabled}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    precio_manual_enabled: e.target.checked,
                    precio_manual: e.target.checked ? formData.precio_manual : ''
                  })}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-semibold text-yellow-800">
                  💰 Ingresar precio manualmente (descuentos/promociones)
                </span>
              </label>
              {formData.precio_manual_enabled && (
                <FormInput
                  label="Precio Manual (S/.)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precio_manual || ''}
                  onChange={(e) => setFormData({ ...formData, precio_manual: e.target.value })}
                  placeholder="Ingrese el precio"
                  className="mt-3"
                  icon="💰"
                  required={formData.precio_manual_enabled}
                />
              )}
              {formData.precio_manual_enabled && formData.precio_manual && (
                <p className="text-sm font-bold text-green-700 mt-2">
                  Precio Final: S/.{parseFloat(formData.precio_manual || 0).toFixed(2)}
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
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">Usuario</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">Fecha y Horario</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">Costo</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">Pago</th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center font-semibold text-xs sm:text-sm md:text-base">Acciones</th>
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
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs sm:text-sm">{reserva.usuario_nombre}</span>
                          <span className="text-xs text-gray-500 mt-1">{reserva.cancha_nombre}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs sm:text-sm">{moment(reserva.fecha).format('DD/MM/YYYY')}</span>
                          <span className="text-xs text-gray-500 mt-1">{reserva.hora_inicio.substring(0, 5)} - {reserva.hora_fin.substring(0, 5)}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-green-600 text-center text-xs sm:text-sm">S/.{parseFloat(reserva.costo_total).toFixed(2)}</td>
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center">
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
                      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                        <div className="flex gap-1 sm:gap-2 justify-center flex-wrap">
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
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  <span className="hidden sm:inline">Editar</span>
                                  <span className="sm:hidden">✏️</span>
                                </Button>
                              )}
                              
                              {/* Botón Cancelar - siempre visible para admin en reservas pasadas, o según lógica normal */}
                              {(reserva.esPasada || reserva.estado === 'pendiente' || (reserva.estado === 'completada' && reserva.pago_id)) && user?.rol === 'admin' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => cambiarEstado(reserva.id, 'cancelada')}
                                  icon="✕"
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  <span className="hidden sm:inline">Cancelar</span>
                                  <span className="sm:hidden">✕</span>
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
                              className="text-xs sm:text-sm px-2 sm:px-3"
                            >
                              <span className="hidden sm:inline">Pagar</span>
                              <span className="sm:hidden">💳</span>
                            </Button>
                          )}
                          
                          {/* Pendiente con pago pendiente: Confirmar pago */}
                          {reserva.estado === 'pendiente' && reserva.pago_estado === 'pendiente' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleConfirmarPago(reserva.id)}
                              icon="✓"
                              className="text-xs sm:text-sm px-2 sm:px-3"
                            >
                              <span className="hidden sm:inline">Confirmar</span>
                              <span className="sm:hidden">✓</span>
                            </Button>
                          )}
                          
                          {/* Completar: solo para confirmadas activas */}
                          {reserva.estado === 'confirmada' && !reserva.esPasada && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => cambiarEstado(reserva.id, 'completada')}
                              icon="✓"
                              className="text-xs sm:text-sm px-2 sm:px-3"
                            >
                              <span className="hidden sm:inline">Completar</span>
                              <span className="sm:hidden">✓</span>
                            </Button>
                          )}
                          
                          {/* Eliminar: solo para canceladas */}
                          {reserva.estado === 'cancelada' && user?.rol === 'admin' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleEliminarReserva(reserva.id)}
                              icon="🗑️"
                              className="text-xs sm:text-sm px-2 sm:px-3"
                            >
                              <span className="hidden sm:inline">Eliminar</span>
                              <span className="sm:hidden">🗑️</span>
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
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          capture="environment"
                          onChange={handleFileChangePago}
                          className="hidden"
                          id="file-input"
                        />
                        <div className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100 transition-all text-center">
                          <span className="text-gray-600">📁 Seleccionar archivo</span>
                        </div>
                      </label>
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
                          muted
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

