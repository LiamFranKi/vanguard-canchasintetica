import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import moment from 'moment';
import 'moment/locale/es';
import swalConfig from '../../utils/swalConfig';

moment.locale('es');

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    reservasHoy: 0,
    pagosPendientes: 0,
    pagosHoy: 0,
    ingresosMes: 0
  });
  const [ultimasReservas, setUltimasReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ejecutandoCancelacion, setEjecutandoCancelacion] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const fechaHoy = moment().format('YYYY-MM-DD');
      const inicioMes = moment().startOf('month').format('YYYY-MM-DD');
      const finMes = moment().endOf('month').format('YYYY-MM-DD');

      const [reservasRes, pagosPendientesRes, pagosConfirmadosRes, todasReservasRes] = await Promise.all([
        api.get('/reservas', { params: { fecha: fechaHoy } }),
        api.get('/pagos', { params: { estado: 'pendiente' } }),
        api.get('/pagos', { params: { estado: 'confirmado' } }),
        api.get('/reservas')
      ]);

      // Validar que todas las respuestas tengan datos
      const todasReservas = Array.isArray(todasReservasRes?.data) ? todasReservasRes.data : [];
      const pagosPendientes = Array.isArray(pagosPendientesRes?.data) ? pagosPendientesRes.data : [];
      const pagosConfirmados = Array.isArray(pagosConfirmadosRes?.data) ? pagosConfirmadosRes.data : [];
      const reservasHoyData = Array.isArray(reservasRes?.data) ? reservasRes.data : [];

      // Crear mapa de reservas para búsqueda rápida
      const reservasMap = {};
      todasReservas.forEach(r => {
        reservasMap[r.id] = r;
      });

      // Crear un set de IDs de reservas que tienen pagos pendientes
      const reservasConPagoPendiente = new Set(pagosPendientes.map(p => p.reserva_id));

      // Reservas de hoy (todas, sin filtro de canceladas porque queremos ver todas)
      const reservasHoy = reservasHoyData.filter(r => 
        moment(r.fecha).format('YYYY-MM-DD') === fechaHoy && r.estado !== 'cancelada'
      );

      // Suma de montos de pagos pendientes:
      // 1. Pagos con estado 'pendiente' de reservas no canceladas
      // 2. Reservas sin pago (sin registro en tabla pagos) que estén pendientes y no canceladas
      let pagosPendientesSuma = pagosPendientes
        .filter(p => {
          const reserva = reservasMap[p.reserva_id];
          if (!reserva) return false;
          return reserva.estado !== 'cancelada';
        })
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

      // Agregar reservas sin pago que estén pendientes (no tienen registro en tabla pagos)
      const reservasSinPago = todasReservas.filter(r => 
        r.estado === 'pendiente' && 
        r.estado !== 'cancelada' &&
        !r.pago_id && // No tiene pago confirmado
        !reservasConPagoPendiente.has(r.id) // No tiene un pago pendiente ya contado
      );
      
      // Sumar el costo de las reservas sin pago
      reservasSinPago.forEach(r => {
        pagosPendientesSuma += parseFloat(r.costo_total || 0);
      });

      // Pagos de hoy (confirmados del día, solo de reservas no canceladas y no pendientes)
      const pagosHoy = pagosConfirmados
        .filter(p => {
          const reserva = reservasMap[p.reserva_id];
          return reserva && 
                 reserva.estado !== 'cancelada' && 
                 reserva.estado !== 'pendiente' &&
                 p.estado === 'confirmado' &&
                 p.fecha_pago && 
                 moment(p.fecha_pago).format('YYYY-MM-DD') === fechaHoy;
        })
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

      // Ingresos del mes (confirmados del mes, solo de reservas no canceladas y no pendientes)
      const ingresosMes = pagosConfirmados
        .filter(p => {
          const reserva = reservasMap[p.reserva_id];
          if (!p.fecha_pago) return false;
          const fechaPago = moment(p.fecha_pago).format('YYYY-MM-DD');
          return reserva && 
                 reserva.estado !== 'cancelada' && 
                 reserva.estado !== 'pendiente' &&
                 p.estado === 'confirmado' &&
                 fechaPago >= inicioMes && 
                 fechaPago <= finMes;
        })
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

      // Obtener últimas reservas para mostrar
      const reservasConfirmadas = todasReservas.filter(r => r.estado === 'completada');
      const reservasOrdenadas = reservasConfirmadas
        .sort((a, b) => new Date(b.fecha + ' ' + b.hora_inicio) - new Date(a.fecha + ' ' + a.hora_inicio))
        .slice(0, 5);

      setStats({
        reservasHoy: reservasHoy.length,
        pagosPendientes: pagosPendientesSuma,
        pagosHoy: pagosHoy,
        ingresosMes: ingresosMes
      });

      setUltimasReservas(reservasOrdenadas);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
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
        
        // Recargar estadísticas
        loadStats();
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
        <div className="text-gray-500">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 break-words">Panel de Administración</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Bienvenido al sistema de gestión de canchas</p>
        </div>
        <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
          {moment().format('dddd, D [de] MMMM [de] YYYY')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Reservas de Hoy</p>
              <p className="text-4xl font-bold text-gray-800">{stats.reservasHoy}</p>
              <Link to="/admin/reservas" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                Ver reservas →
              </Link>
            </div>
            <div className="text-5xl opacity-20">📅</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500 hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pagos Pendientes</p>
              <p className="text-4xl font-bold text-yellow-600">S/.{stats.pagosPendientes.toFixed(2)}</p>
              <Link to="/admin/reservas" className="text-yellow-600 text-sm hover:underline mt-2 inline-block">
                Ver reservas →
              </Link>
            </div>
            <div className="text-5xl opacity-20">⏳</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pagos de Hoy - {moment().format('DD/MM')}</p>
              <p className="text-4xl font-bold text-green-600">S/.{stats.pagosHoy.toFixed(2)}</p>
              <Link to="/admin/reservas" className="text-green-600 text-sm hover:underline mt-2 inline-block">
                Ver reservas →
              </Link>
            </div>
            <div className="text-5xl opacity-20">💰</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Ingresos del Mes - {moment().format('MMMM')}</p>
              <p className="text-4xl font-bold text-purple-600">S/.{stats.ingresosMes.toFixed(2)}</p>
              <Link to="/admin/reservas" className="text-purple-600 text-sm hover:underline mt-2 inline-block">
                Ver reservas →
              </Link>
            </div>
            <div className="text-5xl opacity-20">💵</div>
          </div>
        </div>
      </div>

      {/* Últimas Reservas */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Próximas Reservas</h3>
            <Link to="/admin/reservas" className="text-green-600 text-sm hover:underline">
              Ver todas →
            </Link>
          </div>
          {ultimasReservas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay reservas próximas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ultimasReservas.map((reserva) => (
                <div key={reserva.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{reserva.cancha_nombre}</p>
                      <p className="text-sm text-gray-600">
                        {moment(reserva.fecha).format('DD/MM/YYYY')} - {reserva.hora_inicio}
                      </p>
                      <p className="text-xs text-gray-500">{reserva.usuario_nombre}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      S/.{reserva.costo_total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/canchas"
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center border-2 border-green-200"
          >
            <div className="text-3xl mb-2">⚽</div>
            <div className="font-semibold text-green-700">Nueva Cancha</div>
          </Link>
          <Link
            to="/admin/usuarios"
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center border-2 border-blue-200"
          >
            <div className="text-3xl mb-2">👤</div>
            <div className="font-semibold text-blue-700">Nuevo Usuario</div>
          </Link>
          <Link
            to="/admin/reservas"
            className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition text-center border-2 border-yellow-200"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold text-yellow-700">Ver Reservas</div>
          </Link>
          <Link
            to="/admin/config"
            className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center border-2 border-purple-200"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-semibold text-purple-700">Configuración</div>
          </Link>
        </div>
      </div>

      {/* Tareas Administrativas */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tareas Administrativas</h3>
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
      </div>
    </div>
  );
};

export default AdminDashboard;

