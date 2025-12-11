import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import moment from 'moment';
import swalConfig from '../../utils/swalConfig';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import FormTextarea from '../../components/ui/FormTextarea';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';

const EmpleadoReservas = () => {
  const { user } = useAuth();
  const { getConfig } = useConfig();
  const [reservas, setReservas] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroCancha, setFiltroCancha] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('activas'); // 'activas' o 'pasadas'
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 20;
  const [editandoReserva, setEditandoReserva] = useState(null);
  const [formDataEdicion, setFormDataEdicion] = useState({
    hora_inicio: '',
    hora_fin: '',
    notas: '',
    precio_manual_enabled: false,
    precio_manual: ''
  });
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [reservaParaPago, setReservaParaPago] = useState(null);
  const [formData, setFormData] = useState({
    cancha_id: '',
    usuario_busqueda: '',
    usuario_id: null,
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    notas: ''
  });
  const [formPago, setFormPago] = useState({
    metodo_pago: 'efectivo',
    comprobante: null
  });
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [mostrarRecibo, setMostrarRecibo] = useState(false);
  const [reciboUrl, setReciboUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Si ya hay un usuario seleccionado y el texto tiene el formato "DNI - Nombre", no buscar de nuevo
    if (formData.usuario_id && formData.usuario_busqueda.includes(' - ')) {
      return; // Ya hay un usuario seleccionado, no buscar de nuevo
    }
    
    if (formData.usuario_busqueda && formData.usuario_busqueda.length >= 2) {
      buscarUsuario();
    } else {
      setUsuarios([]);
      if (!formData.usuario_id) {
        setFormData(prev => ({ ...prev, usuario_id: null }));
      }
    }
  }, [formData.usuario_busqueda]);

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  const loadData = async () => {
    try {
      const [canchasRes] = await Promise.all([
        api.get('/canchas?activa=true')
      ]);
      setCanchas(canchasRes.data);
      loadReservas();
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      loadReservas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCancha, filtroEstado, filtroTipo]);

  const loadReservas = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filtroCancha && filtroCancha !== '') {
        const canchaId = parseInt(filtroCancha);
        if (!isNaN(canchaId)) {
          params.cancha_id = canchaId;
        }
      }
      
      if (filtroEstado && filtroEstado !== '' && filtroEstado !== null && filtroEstado !== undefined) {
        const estadoStr = String(filtroEstado).trim();
        if (estadoStr !== '') {
          if (estadoStr === 'pagada') {
            params.estado = 'confirmada';
          } else {
            params.estado = estadoStr;
          }
        }
      }
      
      const response = await api.get('/reservas', { params });
      let reservasFiltradas = Array.isArray(response.data) ? response.data : [];
      
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

  const buscarUsuario = async () => {
    if (formData.usuario_busqueda.length < 2) {
      setUsuarios([]);
      setFormData(prev => ({ ...prev, usuario_id: null }));
      return;
    }
    
    // Si el texto tiene formato "DNI - Nombre", extraer solo el DNI para buscar
    let textoBusqueda = formData.usuario_busqueda.trim();
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
      
      // Si hay exactamente un resultado y coincide con el texto buscado, seleccionarlo automáticamente
      if (usuariosEncontrados.length === 1) {
        const usuario = usuariosEncontrados[0];
        const busqueda = textoBusqueda.toLowerCase().trim();
        const dniMatch = usuario.dni.toLowerCase() === busqueda;
        const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.toLowerCase();
        const nombreMatch = nombreCompleto.includes(busqueda) || busqueda.includes(usuario.dni.toLowerCase());
        
        if (dniMatch || nombreMatch) {
          setFormData(prev => ({
            ...prev,
            usuario_id: usuario.id,
            usuario_busqueda: `${usuario.dni} - ${usuario.nombre} ${usuario.apellido}`
          }));
        } else {
          setFormData(prev => ({ ...prev, usuario_id: null }));
        }
      } else if (usuariosEncontrados.length > 1) {
        // Si hay múltiples resultados, limpiar la selección para que el usuario elija
        setFormData(prev => ({ ...prev, usuario_id: null }));
      } else {
        // Si no hay resultados, limpiar la selección
        setFormData(prev => ({ ...prev, usuario_id: null }));
      }
    } catch (error) {
      console.error('Error buscando usuario:', error);
      setUsuarios([]);
      setFormData(prev => ({ ...prev, usuario_id: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.usuario_id) {
      if (formData.usuario_busqueda.length === 0) {
        swalConfig.toastError('Error', 'Debes buscar y seleccionar un usuario');
      } else if (usuarios.length === 0) {
        swalConfig.toastError('Error', 'No se encontraron usuarios. Verifica el DNI, nombre o apellido e intenta nuevamente');
      } else {
        swalConfig.toastError('Error', 'Por favor, selecciona un usuario de la lista de resultados');
      }
      return;
    }

    try {
      // Crear reserva con el usuario seleccionado
      const reservaData = {
        cancha_id: formData.cancha_id,
        usuario_id: formData.usuario_id,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        notas: formData.notas
      };

      await api.post('/reservas', reservaData);
      
      swalConfig.toastSuccess('¡Reserva Creada!', 'La reserva se ha creado exitosamente');
      
      setMostrarFormulario(false);
      setFormData({
        cancha_id: '',
        usuario_busqueda: '',
        usuario_id: null,
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        notas: ''
      });
      setUsuarios([]);
      loadData();
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
        loadData();
      } catch (error) {
        swalConfig.toastError('Error', 'Error al cancelar la reserva');
      }
    }
  };

  const handleCrearPago = (reserva) => {
    setReservaParaPago(reserva);
    setFormPago({
      metodo_pago: 'efectivo',
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
      console.log('Archivo a enviar:', {
        name: formPago.comprobante.name,
        size: formPago.comprobante.size,
        type: formPago.comprobante.type,
        lastModified: formPago.comprobante.lastModified
      });
      formDataToSend.append('comprobante', formPago.comprobante);
    }

    // Verificar que el FormData tenga el archivo
    console.log('FormData entries:');
    for (let pair of formDataToSend.entries()) {
      console.log(pair[0] + ': ', pair[1]);
    }

    try {
      const response = await api.post(`/reservas/${reservaParaPago.id}/pago`, formDataToSend, {
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
      loadData();
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
        loadData();
      } catch (error) {
        swalConfig.toastError('Error', error.response?.data?.message || 'Error al confirmar el pago');
      }
    }
  };

  const verRecibo = (comprobante) => {
    if (comprobante) {
      const url = `${window.location.origin}${comprobante}`;
      setReciboUrl(url);
      setMostrarRecibo(true);
    }
  };

  const calcularDiasRestantes = (fechaCreacion) => {
    const diasMax = parseInt(getConfig('dias_max_pago') || 3);
    const fechaLimite = moment(fechaCreacion).add(diasMax, 'days');
    const diasRestantes = fechaLimite.diff(moment(), 'days');
    return diasRestantes;
  };

  const handleEditar = (reserva) => {
    setEditandoReserva(reserva.id);
    setFormDataEdicion({
      hora_inicio: reserva.hora_inicio.substring(0, 5),
      hora_fin: reserva.hora_fin.substring(0, 5),
      notas: reserva.notas || '',
      precio_manual_enabled: false,
      precio_manual: ''
    });
  };

  const calcularDuracion = () => {
    if (!formDataEdicion.hora_inicio || !formDataEdicion.hora_fin) return 0;
    const inicio = moment(formDataEdicion.hora_inicio, 'HH:mm');
    const fin = moment(formDataEdicion.hora_fin, 'HH:mm');
    return fin.diff(inicio, 'minutes');
  };

  const calcularNuevoCosto = (reserva) => {
    // Si el precio manual está habilitado, usar ese precio
    if (formDataEdicion.precio_manual_enabled && formDataEdicion.precio_manual) {
      const precioManual = parseFloat(formDataEdicion.precio_manual);
      return isNaN(precioManual) ? 0 : precioManual;
    }

    const duracionMinutos = calcularDuracion();
    if (duracionMinutos <= 0) {
      const costoActual = parseFloat(reserva.costo_total) || 0;
      return costoActual;
    }

    // Determinar turno (día/noche) según la hora de inicio editada
    const horaLimite = moment(reserva.hora_limite_turno || '18:00', 'HH:mm');
    const horaInicioMoment = moment(formDataEdicion.hora_inicio, 'HH:mm');
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
    
    const costoFinal = parseFloat(nuevoCosto) || 0;
    return isNaN(costoFinal) ? 0 : costoFinal;
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    
    if (!editandoReserva) return;

    const reserva = reservas.find(r => r.id === editandoReserva);
    if (!reserva) return;

    try {
      // Si el precio manual está habilitado, usar ese precio; sino calcular
      const nuevoCosto = formDataEdicion.precio_manual_enabled && formDataEdicion.precio_manual 
        ? parseFloat(formDataEdicion.precio_manual) 
        : calcularNuevoCosto(reserva);
      
      console.log('📝 Editando reserva desde EmpleadoReservas:', {
        precio_manual_enabled: formDataEdicion.precio_manual_enabled,
        precio_manual: formDataEdicion.precio_manual,
        nuevoCosto
      });
      
      await api.put(`/reservas/${editandoReserva}`, {
        hora_inicio: formDataEdicion.hora_inicio,
        hora_fin: formDataEdicion.hora_fin,
        notas: formDataEdicion.notas,
        costo_total: nuevoCosto
      });

      swalConfig.toastSuccess('Reserva Actualizada', `La reserva se ha actualizado correctamente. Costo: S/.${nuevoCosto.toFixed(2)}`);
      
      setEditandoReserva(null);
      setFormDataEdicion({ hora_inicio: '', hora_fin: '', notas: '', precio_manual_enabled: false, precio_manual: '' });
      loadReservas();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al actualizar la reserva');
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoReserva(null);
    setFormDataEdicion({ hora_inicio: '', hora_fin: '', notas: '' });
  };

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
        loadData();
      } catch (error) {
        swalConfig.toastError('Error', error.response?.data?.message || 'Error al actualizar el estado');
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

  // Paginación
  const totalPaginas = Math.ceil(reservas.length / itemsPorPagina);
  const inicioIndex = (paginaActual - 1) * itemsPorPagina;
  const finIndex = inicioIndex + itemsPorPagina;
  const reservasPaginadas = reservas.slice(inicioIndex, finIndex);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1">Gestión de Reservas</h1>
          <p className="text-sm sm:text-base text-gray-600">Crea y administra reservas para los usuarios</p>
        </div>
        <Button
          variant={mostrarFormulario ? 'secondary' : 'primary'}
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          icon={mostrarFormulario ? '✕' : '➕'}
          className="w-full sm:w-auto text-sm sm:text-base"
        >
          {mostrarFormulario ? 'Cancelar' : 'Nueva Reserva'}
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-4 sm:mb-6">
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

      {/* Formulario de Edición */}
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
            submitLabel={`Guardar Cambios (Costo: S/.${formDataEdicion.precio_manual_enabled && formDataEdicion.precio_manual ? parseFloat(formDataEdicion.precio_manual).toFixed(2) : nuevoCostoNum.toFixed(2)})`}
            cancelLabel="Cancelar"
            className="mb-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <FormInput
                label="Hora Inicio"
                type="time"
                value={formDataEdicion.hora_inicio}
                onChange={(e) => setFormDataEdicion({ ...formDataEdicion, hora_inicio: e.target.value })}
                required
                icon="🕐"
              />
                <FormInput
                  label="Hora Fin"
                  type="time"
                  value={formDataEdicion.hora_fin}
                  onChange={(e) => setFormDataEdicion({ ...formDataEdicion, hora_fin: e.target.value })}
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
                  checked={formDataEdicion.precio_manual_enabled}
                  onChange={(e) => setFormDataEdicion({ 
                    ...formDataEdicion, 
                    precio_manual_enabled: e.target.checked,
                    precio_manual: e.target.checked ? formDataEdicion.precio_manual : ''
                  })}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-semibold text-yellow-800">
                  💰 Ingresar precio manualmente (descuentos/promociones)
                </span>
              </label>
              {formDataEdicion.precio_manual_enabled && (
                <FormInput
                  label="Precio Manual (S/.)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formDataEdicion.precio_manual || ''}
                  onChange={(e) => setFormDataEdicion({ ...formDataEdicion, precio_manual: e.target.value })}
                  placeholder="Ingrese el precio"
                  className="mt-3"
                  icon="💰"
                  required={formDataEdicion.precio_manual_enabled}
                />
              )}
              {formDataEdicion.precio_manual_enabled && formDataEdicion.precio_manual && (
                <p className="text-sm font-bold text-green-700 mt-2">
                  Precio Final: S/.{parseFloat(formDataEdicion.precio_manual || 0).toFixed(2)}
                </p>
              )}
            </div>

            <FormTextarea
              label="Notas (opcional)"
              value={formDataEdicion.notas}
              onChange={(e) => setFormDataEdicion({ ...formDataEdicion, notas: e.target.value })}
              placeholder="Notas sobre la reserva..."
              rows="3"
              icon="📝"
            />
          </FormCard>
        );
      })()}

      {mostrarFormulario && (
        <FormCard
          title="Nueva Reserva"
          subtitle="Completa los datos para crear una reserva para un usuario"
          onSubmit={handleSubmit}
          onCancel={() => setMostrarFormulario(false)}
          submitLabel="Crear Reserva"
          cancelLabel="Cancelar"
          className="mb-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <FormInput
              label="Buscar Usuario"
              type="text"
                value={formData.usuario_busqueda}
                onChange={(e) => {
                  const nuevoValor = e.target.value;
                  if (!nuevoValor || !nuevoValor.includes(' - ') || nuevoValor !== formData.usuario_busqueda) {
                    setFormData({ ...formData, usuario_busqueda: nuevoValor, usuario_id: null });
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
                      onClick={() => setFormData({ 
                        ...formData, 
                        usuario_id: usuario.id,
                        usuario_busqueda: `${usuario.dni} - ${usuario.nombre} ${usuario.apellido}`
                      })}
                      className={`w-full text-left p-3 bg-white rounded-lg hover:bg-blue-100 transition border-2 ${
                        formData.usuario_id === usuario.id ? 'border-blue-500 bg-blue-50' : 'border-transparent'
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
                        {formData.usuario_id === usuario.id && (
                          <span className="text-green-600 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.usuario_busqueda.length >= 2 && usuarios.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-semibold">
                  ⚠️ No se encontraron usuarios
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Intenta buscar por DNI, nombre o apellido. Asegúrate de escribir correctamente.
                </p>
              </div>
            )}

            {formData.usuario_id && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-semibold flex items-center">
                  <span className="mr-2">✓</span>
                  Usuario seleccionado correctamente
                </p>
              </div>
            )}

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

            <div className="grid grid-cols-2 gap-4">
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
          </div>

          <FormTextarea
            label="Notas (opcional)"
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            placeholder="Agrega alguna nota sobre la reserva..."
            rows="3"
            icon="📝"
          />
        </FormCard>
      )}

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
                          {/* Para empleados: NO mostrar botones si la reserva está pagada Y es pasada */}
                          {!(user?.rol === 'empleado' && reserva.pago_id && reserva.esPasada) && (
                            <>
                              {/* Botón Editar - solo para pendientes y NO pasadas para empleados */}
                              {(
                                reserva.estado === 'pendiente' && !reserva.esPasada
                              ) && (
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
                              {/* Pendiente sin pago: Pagar y Cancelar */}
                              {reserva.estado === 'pendiente' && !reserva.pago_id && (
                                <>
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
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleCancelar(reserva.id)}
                                    icon="✕"
                                    className="text-xs sm:text-sm px-2 sm:px-3"
                                  >
                                    <span className="hidden sm:inline">Cancelar</span>
                                    <span className="sm:hidden">✕</span>
                                  </Button>
                                </>
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
                              {/* Completada/Pagada: Para empleados NO mostrar botones si es pasada, para admin solo Cancelar */}
                              {reserva.estado === 'completada' && reserva.pago_id && user?.rol === 'admin' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleCancelar(reserva.id)}
                                  icon="✕"
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  <span className="hidden sm:inline">Cancelar</span>
                                  <span className="sm:hidden">✕</span>
                                </Button>
                              )}
                              {/* Completada/Pagada pero NO pasada: Para empleados puede cancelar */}
                              {reserva.estado === 'completada' && reserva.pago_id && user?.rol === 'empleado' && !reserva.esPasada && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleCancelar(reserva.id)}
                                  icon="✕"
                                  className="text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  <span className="hidden sm:inline">Cancelar</span>
                                  <span className="sm:hidden">✕</span>
                                </Button>
                              )}
                            </>
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

export default EmpleadoReservas;
