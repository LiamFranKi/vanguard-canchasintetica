import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import swalConfig from '../../utils/swalConfig';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';
import FormTextarea from '../../components/ui/FormTextarea';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const AdminCanchas = () => {
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoCancha, setEditandoCancha] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [mostrarModalPersonal, setMostrarModalPersonal] = useState(false);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    capacidad: 10,
    activa: true,
    imagen: null,
    hora_inicio_atencion: '08:00',
    hora_fin_atencion: '23:00',
    precio_30min: 25.00,
    precio_1hora: 50.00
  });

  useEffect(() => {
    loadCanchas();
    loadEmpleados();
  }, []);

  const loadCanchas = async () => {
    try {
      const response = await api.get('/canchas');
      setCanchas(response.data);
    } catch (error) {
      console.error('Error cargando canchas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpleados = async () => {
    try {
      const response = await api.get('/empleados');
      setEmpleados(response.data || []);
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  const handleEdit = (cancha) => {
    setEditandoCancha(cancha.id);
    setFormData({
      nombre: cancha.nombre || '',
      descripcion: cancha.descripcion || '',
      capacidad: cancha.capacidad || 10,
      activa: cancha.activa !== undefined ? cancha.activa : true,
      imagen: null,
      hora_inicio_atencion: cancha.hora_inicio_atencion ? cancha.hora_inicio_atencion.substring(0, 5) : '08:00',
      hora_fin_atencion: cancha.hora_fin_atencion ? cancha.hora_fin_atencion.substring(0, 5) : '23:00',
      precio_30min: cancha.precio_30min || 25.00,
      precio_1hora: cancha.precio_1hora || 50.00
    });
    setMostrarFormulario(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append('nombre', formData.nombre);
    formDataToSend.append('descripcion', formData.descripcion);
    formDataToSend.append('capacidad', formData.capacidad);
    formDataToSend.append('activa', formData.activa);
    formDataToSend.append('hora_inicio_atencion', formData.hora_inicio_atencion);
    formDataToSend.append('hora_fin_atencion', formData.hora_fin_atencion);
    formDataToSend.append('precio_30min', formData.precio_30min);
    formDataToSend.append('precio_1hora', formData.precio_1hora);
    if (formData.imagen) {
      formDataToSend.append('imagen', formData.imagen);
    }

    try {
      if (editandoCancha) {
        await api.put(`/canchas/${editandoCancha}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        swalConfig.toastSuccess('¡Cancha Actualizada!', 'La cancha se ha actualizado exitosamente');
      } else {
        await api.post('/canchas', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        swalConfig.toastSuccess('¡Cancha Creada!', 'La cancha se ha registrado exitosamente');
      }

      setMostrarFormulario(false);
      setEditandoCancha(null);
      setFormData({ 
        nombre: '', 
        descripcion: '', 
        capacidad: 10, 
        activa: true, 
        imagen: null,
        hora_inicio_atencion: '08:00',
        hora_fin_atencion: '23:00',
        precio_30min: 25.00,
        precio_1hora: 50.00
      });
      loadCanchas();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al guardar la cancha');
    }
  };

  const handleEliminar = async (id) => {
    const result = await swalConfig.confirm(
      '¿Eliminar cancha?',
      'Esta acción no se puede deshacer. ¿Estás seguro?',
      {
        confirmText: 'Sí, eliminar',
        confirmColor: '#ef4444',
        cancelText: 'Cancelar'
      }
    );

    if (result.isConfirmed) {
      try {
        await api.delete(`/canchas/${id}`);
        swalConfig.toastSuccess('Cancha Eliminada', 'La cancha se ha eliminado correctamente');
        loadCanchas();
      } catch (error) {
        swalConfig.toastError('Error', 'Error al eliminar la cancha');
      }
    }
  };

  const abrirModalPersonal = async (cancha) => {
    try {
      const response = await api.get(`/canchas/${cancha.id}/personal`);
      const idsAsignados = (response.data || []).map((e) => e.id);
      setCanchaSeleccionada(cancha);
      setEmpleadosSeleccionados(idsAsignados);
      setMostrarModalPersonal(true);
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al cargar el personal de la cancha');
    }
  };

  const toggleEmpleadoSeleccionado = (id) => {
    setEmpleadosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const guardarPersonalCancha = async (e) => {
    e.preventDefault();
    if (!canchaSeleccionada) return;

    try {
      await api.put(`/canchas/${canchaSeleccionada.id}/personal`, {
        empleados: empleadosSeleccionados
      });
      swalConfig.toastSuccess('Personal actualizado', 'Se ha actualizado el personal asignado a la cancha');
      setMostrarModalPersonal(false);
      setCanchaSeleccionada(null);
      setEmpleadosSeleccionados([]);
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al actualizar el personal de la cancha');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Gestión de Canchas</h1>
          <p className="text-gray-600">Administra las canchas disponibles para alquiler</p>
        </div>
        <Button
          variant={mostrarFormulario ? 'secondary' : 'primary'}
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          icon={mostrarFormulario ? '✕' : '➕'}
        >
          {mostrarFormulario ? 'Cancelar' : 'Nueva Cancha'}
        </Button>
      </div>

      {mostrarFormulario && (
        <FormCard
          title={editandoCancha ? 'Editar Cancha' : 'Nueva Cancha'}
          subtitle={editandoCancha ? 'Modifica los datos de la cancha' : 'Completa los datos para crear una nueva cancha'}
          onSubmit={handleSubmit}
          onCancel={() => {
            setMostrarFormulario(false);
            setEditandoCancha(null);
            setFormData({ 
              nombre: '', 
              descripcion: '', 
              capacidad: 10, 
              activa: true, 
              imagen: null,
              hora_inicio_atencion: '08:00',
              hora_fin_atencion: '23:00',
              precio_30min: 25.00,
              precio_1hora: 50.00
            });
          }}
          submitLabel={editandoCancha ? 'Guardar Cambios' : 'Crear Cancha'}
          cancelLabel="Cancelar"
          className="mb-6"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <FormInput
              label="Nombre de la Cancha"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Cancha 1"
              required
              icon="⚽"
            />
            <FormInput
              label="Capacidad"
              type="number"
              value={formData.capacidad}
              onChange={(e) => setFormData({ ...formData, capacidad: parseInt(e.target.value) || 10 })}
              placeholder="Número de jugadores"
              min="1"
              icon="👥"
            />
            <FormInput
              label="Hora Inicio Atención"
              type="time"
              value={formData.hora_inicio_atencion}
              onChange={(e) => setFormData({ ...formData, hora_inicio_atencion: e.target.value })}
              required
              icon="🕐"
            />
            <FormInput
              label="Hora Fin Atención"
              type="time"
              value={formData.hora_fin_atencion}
              onChange={(e) => setFormData({ ...formData, hora_fin_atencion: e.target.value })}
              required
              icon="🕐"
            />
            <FormInput
              label="Precio 30 Minutos (S/.)"
              type="number"
              step="0.01"
              value={formData.precio_30min}
              onChange={(e) => setFormData({ ...formData, precio_30min: parseFloat(e.target.value) || 0 })}
              placeholder="25.00"
              min="0"
              required
              icon="💰"
            />
            <FormInput
              label="Precio 1 Hora (S/.)"
              type="number"
              step="0.01"
              value={formData.precio_1hora}
              onChange={(e) => setFormData({ ...formData, precio_1hora: parseFloat(e.target.value) || 0 })}
              placeholder="50.00"
              min="0"
              required
              icon="💰"
            />
          </div>
          
          <FormTextarea
            label="Descripción"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Describe las características de la cancha..."
            rows="4"
            icon="📝"
          />
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="mr-2">🖼️</span>
              Imagen de la Cancha
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, imagen: e.target.files[0] })}
                className="
                  w-full px-4 py-3 
                  bg-white border-2 border-gray-200 
                  rounded-xl 
                  focus:border-green-500 focus:ring-4 focus:ring-green-100 
                  transition-all duration-200
                  text-gray-700
                  hover:border-gray-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100
                  cursor-pointer
                "
              />
            </div>
            {formData.imagen && (
              <p className="mt-2 text-sm text-green-600 flex items-center">
                <span className="mr-1">✅</span>
                {formData.imagen.name}
              </p>
            )}
          </div>
        </FormCard>
      )}

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {canchas.map((cancha) => (
            <Card key={cancha.id} className="overflow-hidden hover:scale-105 transition-transform duration-300">
              {cancha.imagen && (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${cancha.imagen}`}
                    alt={cancha.nombre}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                      cancha.activa 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {cancha.activa ? '✓ Activa' : '✗ Inactiva'}
                    </span>
                  </div>
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{cancha.nombre}</h3>
                {cancha.descripcion && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{cancha.descripcion}</p>
                )}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">👥</span>
                    Capacidad: <strong className="ml-1">{cancha.capacidad} jugadores</strong>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">🕐</span>
                    Horario: <strong className="ml-1">
                      {cancha.hora_inicio_atencion ? cancha.hora_inicio_atencion.substring(0, 5) : '08:00'} - {cancha.hora_fin_atencion ? cancha.hora_fin_atencion.substring(0, 5) : '23:00'}
                    </strong>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center text-green-600">
                      <span className="mr-1">💰</span>
                      <span className="font-semibold">30min: S/.{cancha.precio_30min || 25}</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <span className="mr-1">💰</span>
                      <span className="font-semibold">1h: S/.{cancha.precio_1hora || 50}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => abrirModalPersonal(cancha)}
                    className="flex-1"
                    icon="👥"
                  >
                    Personal
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(cancha)}
                    className="flex-1"
                    icon="✏️"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleEliminar(cancha.id)}
                    className="flex-1"
                    icon="🗑️"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de gestión de personal por cancha */}
      {mostrarModalPersonal && canchaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <FormCard
              title={`Personal asignado - ${canchaSeleccionada.nombre}`}
              subtitle="Selecciona los empleados que podrán gestionar esta cancha"
              onSubmit={guardarPersonalCancha}
              onCancel={() => {
                setMostrarModalPersonal(false);
                setCanchaSeleccionada(null);
                setEmpleadosSeleccionados([]);
              }}
              submitLabel="Guardar asignación"
              cancelLabel="Cerrar"
            >
              {empleados.length === 0 ? (
                <p className="text-sm text-gray-500">No hay empleados registrados. Crea empleados en el módulo de Usuarios.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {empleados.map((empleado) => {
                    const checked = empleadosSeleccionados.includes(empleado.id);
                    return (
                      <label
                        key={empleado.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          checked ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-gray-800">
                            {empleado.nombre} {empleado.apellido}
                          </p>
                          <p className="text-xs text-gray-500">
                            DNI: {empleado.dni} {empleado.email && `· ${empleado.email}`}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEmpleadoSeleccionado(empleado.id)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </FormCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCanchas;

