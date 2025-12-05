import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import moment from 'moment';
import swalConfig from '../../utils/swalConfig';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import FormSelect from '../../components/ui/FormSelect';
import FormCard from '../../components/ui/FormCard';
import FormInput from '../../components/ui/FormInput';

const AdminPagos = () => {
  const [pagos, setPagos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formData, setFormData] = useState({
    reserva_id: '',
    usuario_id: '',
    metodo_pago: 'efectivo',
    referencia_pago: '',
    comprobante: null
  });

  useEffect(() => {
    loadPagos();
    loadReservas();
    loadUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  const loadPagos = async () => {
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const response = await api.get('/pagos', { params });
      setPagos(response.data);
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReservas = async () => {
    try {
      const response = await api.get('/reservas', { params: { estado: 'pendiente' } });
      setReservas(response.data);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    }
  };

  const loadUsuarios = async () => {
    try {
      const response = await api.get('/users');
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, comprobante: e.target.files[0] });
  };

  const handleCrearPago = async (e) => {
    e.preventDefault();
    
    if (!formData.reserva_id || !formData.usuario_id) {
      swalConfig.toastError('Error', 'Debes seleccionar una reserva y un usuario');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('reserva_id', formData.reserva_id);
    formDataToSend.append('usuario_id', formData.usuario_id);
    formDataToSend.append('metodo_pago', formData.metodo_pago);
    if (formData.referencia_pago) {
      formDataToSend.append('referencia_pago', formData.referencia_pago);
    }
    if (formData.comprobante) {
      formDataToSend.append('comprobante', formData.comprobante);
    }

    try {
      await api.post('/pagos', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      swalConfig.toastSuccess('¡Pago Creado!', 'El pago se ha creado correctamente');
      
      setMostrarFormulario(false);
      setFormData({
        reserva_id: '',
        usuario_id: '',
        metodo_pago: 'efectivo',
        referencia_pago: '',
        comprobante: null
      });
      loadPagos();
      loadReservas();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al crear el pago');
    }
  };

  const confirmarPago = async (id) => {
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
        await api.put(`/pagos/${id}/confirmar`);
        swalConfig.toastSuccess('Pago Confirmado', 'El pago se ha confirmado correctamente');
        loadPagos();
      } catch (error) {
        swalConfig.toastError('Error', 'Error al confirmar el pago');
      }
    }
  };

  const rechazarPago = async (id) => {
    const result = await swalConfig.confirm(
      '¿Rechazar pago?',
      'Esta acción rechazará el pago. ¿Estás seguro?',
      {
        confirmText: 'Sí, rechazar',
        confirmColor: '#ef4444',
        cancelText: 'Cancelar'
      }
    );

    if (result.isConfirmed) {
      try {
        await api.put(`/pagos/${id}/rechazar`);
        swalConfig.toastSuccess('Pago Rechazado', 'El pago se ha rechazado');
        loadPagos();
      } catch (error) {
        swalConfig.toastError('Error', 'Error al rechazar el pago');
      }
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      confirmado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Gestión de Pagos</h1>
          <p className="text-gray-600">Administra todos los pagos del sistema</p>
        </div>
        <div className="flex gap-4 items-center">
          <FormSelect
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'confirmado', label: 'Confirmado' },
              { value: 'rechazado', label: 'Rechazado' }
            ]}
            className="w-64 mb-0"
          />
          <Button
            variant={mostrarFormulario ? 'secondary' : 'primary'}
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            icon={mostrarFormulario ? '✕' : '➕'}
          >
            {mostrarFormulario ? 'Cancelar' : 'Crear Pago'}
          </Button>
        </div>
      </div>

      {mostrarFormulario && (
        <FormCard
          title="Crear Pago"
          subtitle="Registra un pago para una reserva"
          onSubmit={handleCrearPago}
          onCancel={() => {
            setMostrarFormulario(false);
            setFormData({
              reserva_id: '',
              usuario_id: '',
              metodo_pago: 'efectivo',
              referencia_pago: '',
              comprobante: null
            });
          }}
          submitLabel="Crear Pago"
          cancelLabel="Cancelar"
          className="mb-6"
        >
          <FormSelect
            label="Usuario"
            value={formData.usuario_id}
            onChange={(e) => {
              setFormData({ ...formData, usuario_id: e.target.value, reserva_id: '' });
            }}
            options={usuarios.map(u => ({
              value: u.id,
              label: `${u.dni} - ${u.nombre} ${u.apellido}`
            }))}
            placeholder="Seleccionar usuario"
            required
            icon="👤"
          />

          <FormSelect
            label="Reserva"
            value={formData.reserva_id}
            onChange={(e) => setFormData({ ...formData, reserva_id: e.target.value })}
            options={reservas
              .filter(r => !formData.usuario_id || r.usuario_id === parseInt(formData.usuario_id))
              .map(r => ({
                value: r.id,
                label: `${r.cancha_nombre} - ${moment(r.fecha).format('DD/MM/YYYY')} ${r.hora_inicio.substring(0, 5)} - ${r.hora_fin.substring(0, 5)} - S/.${r.costo_total}`
              }))}
            placeholder="Seleccionar reserva"
            required
            disabled={!formData.usuario_id}
            icon="📅"
          />

          <FormSelect
            label="Método de Pago"
            value={formData.metodo_pago}
            onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'yape', label: 'Yape' },
              { value: 'transferencia', label: 'Transferencia Bancaria' },
              { value: 'deposito', label: 'Depósito Bancario' },
              { value: 'online', label: 'Pago Online' }
            ]}
            required
            icon="💳"
          />

          {(formData.metodo_pago === 'deposito' || formData.metodo_pago === 'transferencia') && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="mr-2">📄</span>Comprobante de Pago
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all"
                required
              />
              {formData.comprobante && (
                <p className="mt-2 text-sm text-green-600 flex items-center">
                  <span className="mr-1">✅</span>
                  {formData.comprobante.name}
                </p>
              )}
            </div>
          )}

          {(formData.metodo_pago === 'online' || formData.metodo_pago === 'yape') && (
            <FormInput
              label={formData.metodo_pago === 'yape' ? "Número de Operación Yape" : "Referencia de Pago"}
              type="text"
              value={formData.referencia_pago}
              onChange={(e) => setFormData({ ...formData, referencia_pago: e.target.value })}
              placeholder={formData.metodo_pago === 'yape' ? "Ej: 123456789" : "Número de referencia del pago"}
              required
              icon="🔢"
            />
          )}
        </FormCard>
      )}

      {loading ? (
        <div className="text-center py-12">Cargando...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                  <th className="px-6 py-4 text-left font-semibold">Usuario</th>
                  <th className="px-6 py-4 text-left font-semibold">Cancha</th>
                  <th className="px-6 py-4 text-left font-semibold">Fecha</th>
                  <th className="px-6 py-4 text-left font-semibold">Monto</th>
                  <th className="px-6 py-4 text-left font-semibold">Método</th>
                  <th className="px-6 py-4 text-left font-semibold">Estado</th>
                  <th className="px-6 py-4 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-semibold">{pago.usuario_nombre}</td>
                    <td className="px-6 py-4">{pago.cancha_nombre}</td>
                    <td className="px-6 py-4">{moment(pago.fecha).format('DD/MM/YYYY')}</td>
                    <td className="px-6 py-4 font-semibold text-green-600">S/.{pago.monto}</td>
                    <td className="px-6 py-4 capitalize">{pago.metodo_pago}</td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-2 rounded-full text-xs font-semibold shadow-md ${getEstadoColor(pago.estado)}`}>
                        {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        {pago.comprobante && (
                          <a
                            href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${pago.comprobante}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            📄 Ver
                          </a>
                        )}
                        {pago.estado === 'pendiente' && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => confirmarPago(pago.id)}
                              icon="✓"
                            >
                              Confirmar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => rechazarPago(pago.id)}
                              icon="✕"
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminPagos;

