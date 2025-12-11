import React, { useEffect, useState } from 'react';
import api from '../services/api';
import moment from 'moment';
import swalConfig from '../utils/swalConfig';
import FormCard from '../components/ui/FormCard';
import FormInput from '../components/ui/FormInput';
import FormSelect from '../components/ui/FormSelect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Pagos = () => {
  const [pagos, setPagos] = useState([]);
  const [reservasPendientes, setReservasPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formData, setFormData] = useState({
    reserva_id: '',
    metodo_pago: 'deposito',
    referencia_pago: '',
    comprobante: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pagosRes, reservasRes] = await Promise.all([
        api.get('/pagos'),
        api.get('/reservas?estado=pendiente')
      ]);
      
      setPagos(pagosRes.data);
      setReservasPendientes(reservasRes.data.filter(r => !r.pago_id));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, comprobante: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('reserva_id', formData.reserva_id);
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

      swalConfig.toastSuccess('¡Pago Registrado!', 'Tu pago ha sido registrado y está pendiente de confirmación');

      setMostrarFormulario(false);
      setFormData({
        reserva_id: '',
        metodo_pago: 'deposito',
        referencia_pago: '',
        comprobante: null
      });
      loadData();
    } catch (error) {
      swalConfig.toastError('Error', error.response?.data?.message || 'Error al registrar el pago');
    }
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Mis Pagos</h1>
          <p className="text-gray-600">Gestiona todos tus pagos y reservas pendientes</p>
        </div>
        {reservasPendientes.length > 0 && (
          <Button
            variant={mostrarFormulario ? 'secondary' : 'primary'}
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            icon={mostrarFormulario ? '✕' : '💰'}
          >
            {mostrarFormulario ? 'Cancelar' : 'Registrar Pago'}
          </Button>
        )}
      </div>

      {mostrarFormulario && (
        <FormCard
          title="Registrar Pago"
          subtitle="Completa los datos para registrar tu pago"
          onSubmit={handleSubmit}
          onCancel={() => {
            setMostrarFormulario(false);
            setFormData({ reserva_id: '', metodo_pago: 'deposito', referencia_pago: '', comprobante: null });
          }}
          submitLabel="Registrar Pago"
          cancelLabel="Cancelar"
          className="mb-6"
        >
          <FormSelect
            label="Reserva"
            value={formData.reserva_id}
            onChange={(e) => setFormData({ ...formData, reserva_id: e.target.value })}
            options={reservasPendientes.map(r => ({
              value: r.id,
              label: `${r.cancha_nombre} - ${moment(r.fecha).format('DD/MM/YYYY')} - S/.${r.costo_total}`
            }))}
            placeholder="Seleccionar reserva"
            required
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
                <span className="mr-2">📄</span>Comprobante de Depósito
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
        <div className="text-center py-12">
          <div className="text-gray-500">Cargando pagos...</div>
        </div>
      ) : pagos.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-7xl mb-6 animate-bounce">💰</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No tienes pagos registrados</h3>
          <p className="text-gray-600 mb-8 text-lg">Registra un pago para comenzar</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pagos.map((pago) => (
            <Card
              key={pago.id}
              className="border-l-4 border-green-500 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {pago.cancha_nombre}
                    </h3>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md ${
                      pago.estado === 'confirmado' ? 'bg-green-100 text-green-800 border border-green-200' :
                      pago.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 text-xl">📅</span>
                      <div>
                        <p className="text-xs text-gray-500">Fecha</p>
                        <p className="font-semibold">{moment(pago.fecha).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 text-xl">💰</span>
                      <div>
                        <p className="text-xs text-gray-500">Monto</p>
                        <p className="font-semibold text-green-600">S/.{pago.monto}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 text-xl">💳</span>
                      <div>
                        <p className="text-xs text-gray-500">Método</p>
                        <p className="font-semibold capitalize">{pago.metodo_pago}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {pago.comprobante && (
                  <div className="ml-4">
                    <a
                      href={`${window.location.origin}${pago.comprobante}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition font-semibold text-sm shadow-md hover:shadow-lg"
                    >
                      📄 Ver Comprobante
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Pagos;

