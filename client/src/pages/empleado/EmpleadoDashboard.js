import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import moment from 'moment';
import 'moment/locale/es';
import swalConfig from '../../utils/swalConfig';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

moment.locale('es');

const EmpleadoDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    reservasHoy: 0,
    reservasPendientes: 0,
    usuariosCreados: 0,
    ingresosHoy: 0,
    ingresosMes: 0
  });
  const [reservasHoy, setReservasHoy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ejecutandoCancelacion, setEjecutandoCancelacion] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Nota: Las APIs de reservas y pagos ya filtran automáticamente por canchas asignadas para empleados
      const [reservasRes, usuariosRes, pagosRes] = await Promise.all([
        api.get('/reservas'), // Solo reservas de canchas asignadas
        api.get('/users?rol=usuario'),
        api.get('/pagos?estado=confirmado') // Solo pagos de canchas asignadas
      ]);

      const reservas = reservasRes.data;
      const pagos = pagosRes.data;
      const hoy = moment().format('YYYY-MM-DD');
      const inicioMes = moment().startOf('month').format('YYYY-MM-DD');
      const finMes = moment().endOf('month').format('YYYY-MM-DD');

      // Crear un mapa de reservas por ID para búsqueda rápida
      const reservasMap = {};
      reservas.forEach(r => {
        reservasMap[r.id] = r;
      });

      // Reservas de hoy
      const reservasHoyList = reservas.filter(r => 
        moment(r.fecha).format('YYYY-MM-DD') === hoy && r.estado !== 'cancelada'
      );

      // Calcular ingresos de hoy (pagos confirmados del día de hoy, solo de reservas NO canceladas y confirmadas)
      const ingresosHoy = pagos
        .filter(p => {
          const reserva = reservasMap[p.reserva_id];
          return reserva && 
                 reserva.estado !== 'cancelada' && 
                 reserva.estado !== 'pendiente' && // No pendientes
                 p.estado === 'confirmado' &&
                 p.fecha_pago && 
                 moment(p.fecha_pago).format('YYYY-MM-DD') === hoy;
        })
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

      // Calcular ingresos del mes (pagos confirmados del mes actual, solo de reservas NO canceladas y confirmadas)
      const ingresosMes = pagos
        .filter(p => {
          const reserva = reservasMap[p.reserva_id];
          if (!p.fecha_pago) return false;
          const fechaPago = moment(p.fecha_pago).format('YYYY-MM-DD');
          return reserva && 
                 reserva.estado !== 'cancelada' && 
                 reserva.estado !== 'pendiente' && // No pendientes
                 p.estado === 'confirmado' &&
                 fechaPago >= inicioMes && 
                 fechaPago <= finMes;
        })
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

      setStats({
        reservasHoy: reservasHoyList.length,
        reservasPendientes: reservas.filter(r => r.estado === 'pendiente').length,
        usuariosCreados: usuariosRes.data.length,
        ingresosHoy: ingresosHoy,
        ingresosMes: ingresosMes
      });

      setReservasHoy(reservasHoyList.slice(0, 5));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const ejecutarCancelacionVencidas = async () => {
    const result = await swalConfig.confirm(
      '¿Cancelar reservas vencidas?',
      'Esta acción cancelará automáticamente todas las reservas pendientes sin pago que hayan superado el plazo configurado. ¿Deseas continuar?',
      {
        confirmText: 'Sí, ejecutar',
        confirmColor: '#ef4444',
        cancelText: 'Cancelar'
      }
    );

    if (result.isConfirmed) {
      setEjecutandoCancelacion(true);
      try {
        const response = await api.post('/reservas/cancelar-vencidas');
        const { canceladas } = response.data;
        
        if (canceladas > 0) {
          swalConfig.toastSuccess(
            'Reservas Canceladas', 
            `Se cancelaron ${canceladas} reserva(s) vencida(s) sin pago. Los espacios han sido liberados.`
          );
        } else {
          swalConfig.toastSuccess(
            'Sin Reservas Vencidas', 
            'No hay reservas vencidas para cancelar en este momento.'
          );
        }
        
        // Recargar datos
        loadData();
      } catch (error) {
        swalConfig.toastError('Error', error.response?.data?.message || 'Error al ejecutar la cancelación');
      } finally {
        setEjecutandoCancelacion(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">
          Bienvenido, {user?.nombre} 👔
        </h1>
        <p className="text-gray-600">Panel de control para empleados</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <Card className="border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">Reservas Hoy</p>
              <p className="text-4xl font-bold text-gray-800">{stats.reservasHoy}</p>
            </div>
            <div className="text-5xl opacity-20">📅</div>
          </div>
        </Card>

        <Card className="border-l-4 border-yellow-500 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">Reservas Pendientes</p>
              <p className="text-4xl font-bold text-gray-800">{stats.reservasPendientes}</p>
            </div>
            <div className="text-5xl opacity-20">⏳</div>
          </div>
        </Card>

        <Card className="border-l-4 border-green-500 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">
                Ingresos de Hoy - {moment().format('DD/MM')}
              </p>
              <p className="text-4xl font-bold text-green-600">S/.{stats.ingresosHoy.toFixed(2)}</p>
            </div>
            <div className="text-5xl opacity-20">💰</div>
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold mb-1">
                Ingresos del Mes - {moment().format('MMMM')}
              </p>
              <p className="text-4xl font-bold text-purple-600">S/.{stats.ingresosMes.toFixed(2)}</p>
            </div>
            <div className="text-5xl opacity-20">💵</div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas" className="mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/empleado/reservas">
            <div className="p-6 border-2 border-green-500 rounded-xl hover:bg-green-50 transition-all duration-200 text-center transform hover:scale-105">
              <div className="text-4xl mb-3">📋</div>
              <div className="font-bold text-green-700 text-lg">Gestionar Reservas</div>
              <div className="text-sm text-gray-600 mt-1">Crear y administrar reservas</div>
            </div>
          </Link>

          <Link to="/empleado/horarios">
            <div className="p-6 border-2 border-blue-500 rounded-xl hover:bg-blue-50 transition-all duration-200 text-center transform hover:scale-105">
              <div className="text-4xl mb-3">📅</div>
              <div className="font-bold text-blue-700 text-lg">Ver Horarios</div>
              <div className="text-sm text-gray-600 mt-1">Consultar disponibilidad</div>
            </div>
          </Link>

          <Link to="/empleado/usuarios">
            <div className="p-6 border-2 border-purple-500 rounded-xl hover:bg-purple-50 transition-all duration-200 text-center transform hover:scale-105">
              <div className="text-4xl mb-3">👥</div>
              <div className="font-bold text-purple-700 text-lg">Crear Usuarios</div>
              <div className="text-sm text-gray-600 mt-1">Registrar nuevos usuarios</div>
            </div>
          </Link>
        </div>
      </Card>

      {/* Reservas de Hoy */}
      {reservasHoy.length > 0 && (
        <Card title="Reservas de Hoy">
          <div className="space-y-4">
            {reservasHoy.map((reserva) => (
              <Card
                key={reserva.id}
                className="border-l-4 border-blue-500 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{reserva.cancha_nombre}</h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <span className="mr-2">👤</span>
                      <span className="font-semibold">{reserva.usuario_nombre || 'Usuario'}</span>
                    </div>
                    <div className="flex items-center text-gray-600 mb-2">
                      <span className="mr-2">🕐</span>
                      <span>{reserva.hora_inicio} - {reserva.hora_fin}</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <span className="mr-2">💰</span>
                      <span className="font-bold text-lg">S/.{reserva.costo_total}</span>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md ${
                    reserva.estado === 'completada' 
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Tareas Administrativas */}
      <Card title="Tareas Administrativas" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={ejecutarCancelacionVencidas}
            disabled={ejecutandoCancelacion}
            className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition text-left border-2 border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl mb-2">🗑️</div>
                <div className="font-semibold text-red-700">Cancelar Reservas Vencidas</div>
                <div className="text-xs text-red-600 mt-1">
                  Cancela automáticamente reservas sin pago vencidas
                </div>
              </div>
              {ejecutandoCancelacion && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
              )}
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default EmpleadoDashboard;

