import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import moment from 'moment';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import FormSelect from '../../components/ui/FormSelect';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import swalConfig from '../../utils/swalConfig';

moment.locale('es');

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const AdminReportes = () => {
  const { user } = useAuth();
  const [tipoReporte, setTipoReporte] = useState('ingresos');
  const [canchas, setCanchas] = useState([]);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState('todas');
  const [fechaInicio, setFechaInicio] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState(moment().format('YYYY-MM-DD'));
  const [datosReporte, setDatosReporte] = useState(null);
  const [loading, setLoading] = useState(false);
  const [periodoComparativo, setPeriodoComparativo] = useState('mes'); // mes, semana
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    loadCanchas();
  }, []);

  useEffect(() => {
    if (tipoReporte) {
      generarReporte();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoReporte, canchaSeleccionada, fechaInicio, fechaFin, periodoComparativo]);

  const loadCanchas = async () => {
    try {
      const response = await api.get('/canchas?activa=true');
      setCanchas(response.data);
    } catch (error) {
      console.error('Error cargando canchas:', error);
    }
  };

  const generarReporte = async () => {
    setLoading(true);
    try {
      let params = {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      };

      if (canchaSeleccionada !== 'todas') {
        params.cancha_id = canchaSeleccionada;
      }

      const [reservasRes, pagosRes, pagosPendientesRes] = await Promise.all([
        api.get('/reservas', { params }),
        api.get('/pagos', { params: { estado: 'confirmado' } }),
        api.get('/pagos', { params: { estado: 'pendiente' } })
      ]);

      const reservas = Array.isArray(reservasRes?.data) ? reservasRes.data : [];
      const pagos = Array.isArray(pagosRes?.data) ? pagosRes.data : [];
      const pagosPendientes = Array.isArray(pagosPendientesRes?.data) ? pagosPendientesRes.data : [];

      // Filtrar pagos por fecha de pago si existe
      const pagosFiltrados = pagos.filter(p => {
        if (!p.fecha_pago) return false;
        const fechaPago = moment(p.fecha_pago).format('YYYY-MM-DD');
        return fechaPago >= fechaInicio && fechaPago <= fechaFin;
      });

      // Crear mapa de reservas para búsqueda rápida
      const reservasMap = {};
      reservas.forEach(r => {
        reservasMap[r.id] = r;
      });

      // Filtrar solo pagos de reservas en el rango (no canceladas ni pendientes)
      const pagosValidos = pagosFiltrados.filter(p => {
        const reserva = reservasMap[p.reserva_id];
        return reserva && 
               reserva.estado !== 'cancelada' && 
               reserva.estado !== 'pendiente';
      });

      let datos = null;

      switch (tipoReporte) {
        case 'ingresos':
          datos = await generarReporteIngresos(reservas, pagosValidos, reservasMap);
          break;
        case 'reservas':
          datos = generarReporteReservas(reservas);
          break;
        case 'clientes':
          datos = generarReporteClientes(reservas, pagosValidos);
          break;
        case 'comparativo':
          datos = await generarReporteComparativo(reservas, pagosValidos, reservasMap);
          break;
        case 'horarios-pico':
          datos = generarReporteHorariosPico(reservas);
          break;
        case 'cancelaciones':
          datos = generarReporteCancelaciones(reservas);
          break;
        case 'pagos-pendientes':
          datos = generarReportePagosPendientes(reservas, pagosPendientes, reservasMap);
          break;
        default:
          datos = null;
      }

      setDatosReporte(datos);
    } catch (error) {
      console.error('Error generando reporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarReporteIngresos = async (reservas, pagos, reservasMap) => {
    let ingresosTotal = 0;
    const ingresosPorCancha = {};
    const ingresosPorMetodo = {};
    const ingresosPorDia = {};
    const ingresosPorTurno = { dia: 0, noche: 0 };

    pagos.forEach(pago => {
      const monto = parseFloat(pago.monto || 0);
      ingresosTotal += monto;

      const reserva = reservasMap[pago.reserva_id];
      if (reserva) {
        const canchaNombre = reserva.cancha_nombre || 'Sin cancha';
        ingresosPorCancha[canchaNombre] = (ingresosPorCancha[canchaNombre] || 0) + monto;

        const fechaPago = moment(pago.fecha_pago).format('YYYY-MM-DD');
        ingresosPorDia[fechaPago] = (ingresosPorDia[fechaPago] || 0) + monto;

        // Determinar turno (día/noche) según la hora de inicio de la reserva
        if (reserva.hora_inicio) {
          const horaLimite = reserva.hora_limite_turno ? moment(reserva.hora_limite_turno, 'HH:mm:ss') : moment('18:00', 'HH:mm');
          const horaInicio = moment(reserva.hora_inicio, 'HH:mm:ss');
          const esTurnoNoche = horaInicio.isSameOrAfter(horaLimite);
          
          if (esTurnoNoche) {
            ingresosPorTurno.noche += monto;
          } else {
            ingresosPorTurno.dia += monto;
          }
        }
      }

      const metodo = pago.metodo_pago || 'Sin método';
      ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + monto;
    });

    return {
      tipo: 'ingresos',
      total: ingresosTotal,
      porCancha: Object.entries(ingresosPorCancha)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total),
      porMetodo: Object.entries(ingresosPorMetodo)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total),
      porDia: Object.entries(ingresosPorDia)
        .map(([fecha, total]) => ({ fecha, total }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
      porTurno: [
        { nombre: 'Día', total: ingresosPorTurno.dia },
        { nombre: 'Noche', total: ingresosPorTurno.noche }
      ],
      cantidadPagos: pagos.length
    };
  };

  const generarReporteReservas = (reservas) => {
    const reservasFiltradas = reservas.filter(r => 
      r.estado !== 'cancelada' || canchaSeleccionada !== 'todas' || 
      (canchaSeleccionada === 'todas' || r.cancha_id === parseInt(canchaSeleccionada))
    );

    const reservasPorCancha = {};
    const reservasPorEstado = {};
    const reservasPorDia = {};

    reservasFiltradas.forEach(reserva => {
      const canchaNombre = reserva.cancha_nombre || 'Sin cancha';
      reservasPorCancha[canchaNombre] = (reservasPorCancha[canchaNombre] || 0) + 1;

      const estado = reserva.estado || 'Sin estado';
      reservasPorEstado[estado] = (reservasPorEstado[estado] || 0) + 1;

      const fecha = moment(reserva.fecha).format('YYYY-MM-DD');
      reservasPorDia[fecha] = (reservasPorDia[fecha] || 0) + 1;
    });

    return {
      tipo: 'reservas',
      total: reservasFiltradas.length,
      porCancha: Object.entries(reservasPorCancha)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      porEstado: Object.entries(reservasPorEstado)
        .map(([nombre, cantidad]) => ({ nombre, cantidad })),
      porDia: Object.entries(reservasPorDia)
        .map(([fecha, cantidad]) => ({ fecha, cantidad }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    };
  };

  const generarReporteClientes = (reservas, pagos) => {
    const clientesMap = {};
    const pagosMap = {};
    
    pagos.forEach(p => {
      pagosMap[p.reserva_id] = p;
    });

    reservas.forEach(reserva => {
      const usuarioId = reserva.usuario_id;
      const usuarioNombre = reserva.usuario_nombre || 'Sin nombre';

      if (!clientesMap[usuarioId]) {
        clientesMap[usuarioId] = {
          id: usuarioId,
          nombre: usuarioNombre,
          dni: reserva.usuario_dni || '',
          reservas: 0,
          ingresos: 0
        };
      }

      clientesMap[usuarioId].reservas += 1;

      const pago = pagosMap[reserva.id];
      if (pago) {
        clientesMap[usuarioId].ingresos += parseFloat(pago.monto || 0);
      }
    });

    return {
      tipo: 'clientes',
      total: Object.keys(clientesMap).length,
      topClientes: Object.values(clientesMap)
        .sort((a, b) => b.ingresos - a.ingresos)
        .slice(0, 20)
    };
  };

  const generarReporteComparativo = async (reservas, pagos, reservasMap) => {
    const inicioActual = moment(fechaInicio);
    const finActual = moment(fechaFin);
    const duracion = finActual.diff(inicioActual, 'days');

    let inicioAnterior, finAnterior;
    if (periodoComparativo === 'mes') {
      inicioAnterior = moment(fechaInicio).subtract(1, 'month');
      finAnterior = moment(fechaFin).subtract(1, 'month');
    } else {
      inicioAnterior = moment(fechaInicio).subtract(7, 'days');
      finAnterior = moment(fechaFin).subtract(7, 'days');
    }

    // Obtener datos del período anterior
    let paramsAnterior = {
      fecha_inicio: inicioAnterior.format('YYYY-MM-DD'),
      fecha_fin: finAnterior.format('YYYY-MM-DD')
    };
    if (canchaSeleccionada !== 'todas') {
      paramsAnterior.cancha_id = canchaSeleccionada;
    }

    const [reservasAnteriorRes, pagosAnteriorRes] = await Promise.all([
      api.get('/reservas', { params: paramsAnterior }),
      api.get('/pagos', { params: { estado: 'confirmado' } })
    ]);

    const reservasAnterior = Array.isArray(reservasAnteriorRes?.data) ? reservasAnteriorRes.data : [];
    const pagosAnterior = Array.isArray(pagosAnteriorRes?.data) ? pagosAnteriorRes.data : [];

    const pagosFiltradosAnterior = pagosAnterior.filter(p => {
      if (!p.fecha_pago) return false;
      const fechaPago = moment(p.fecha_pago).format('YYYY-MM-DD');
      return fechaPago >= inicioAnterior.format('YYYY-MM-DD') && fechaPago <= finAnterior.format('YYYY-MM-DD');
    });

    const reservasMapAnterior = {};
    reservasAnterior.forEach(r => {
      reservasMapAnterior[r.id] = r;
    });

    const pagosValidosAnterior = pagosFiltradosAnterior.filter(p => {
      const reserva = reservasMapAnterior[p.reserva_id];
      return reserva && reserva.estado !== 'cancelada' && reserva.estado !== 'pendiente';
    });

    const ingresosActual = pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
    const ingresosAnterior = pagosValidosAnterior.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
    const variacionIngresos = ingresosAnterior > 0 ? ((ingresosActual - ingresosAnterior) / ingresosAnterior * 100).toFixed(1) : 0;

    const reservasActual = reservas.filter(r => r.estado !== 'cancelada').length;
    const reservasAnteriorCount = reservasAnterior.filter(r => r.estado !== 'cancelada').length;
    const variacionReservas = reservasAnteriorCount > 0 ? ((reservasActual - reservasAnteriorCount) / reservasAnteriorCount * 100).toFixed(1) : 0;

    return {
      tipo: 'comparativo',
      periodoActual: `${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`,
      periodoAnterior: `${inicioAnterior.format('DD/MM/YYYY')} - ${finAnterior.format('DD/MM/YYYY')}`,
      ingresosActual,
      ingresosAnterior,
      variacionIngresos: parseFloat(variacionIngresos),
      reservasActual,
      reservasAnterior: reservasAnteriorCount,
      variacionReservas: parseFloat(variacionReservas)
    };
  };

  const generarReporteHorariosPico = (reservas) => {
    const reservasValidas = reservas.filter(r => r.estado !== 'cancelada' && r.estado !== 'pendiente');
    
    const porDiaSemana = {};
    const porHora = {};

    reservasValidas.forEach(reserva => {
      const fecha = moment(reserva.fecha);
      const diaSemana = fecha.format('dddd'); // lunes, martes, etc.
      const horaInicio = reserva.hora_inicio.substring(0, 2); // Solo la hora

      porDiaSemana[diaSemana] = (porDiaSemana[diaSemana] || 0) + 1;
      porHora[horaInicio] = (porHora[horaInicio] || 0) + 1;
    });

    return {
      tipo: 'horarios-pico',
      porDiaSemana: Object.entries(porDiaSemana)
        .map(([dia, cantidad]) => ({ dia: dia.charAt(0).toUpperCase() + dia.slice(1), cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      porHora: Object.entries(porHora)
        .map(([hora, cantidad]) => ({ hora: `${hora}:00`, cantidad }))
        .sort((a, b) => a.hora.localeCompare(b.hora))
    };
  };

  const generarReporteCancelaciones = (reservas) => {
    const canceladas = reservas.filter(r => r.estado === 'cancelada');
    const totalReservas = reservas.length;
    const porcentajeCancelacion = totalReservas > 0 ? ((canceladas.length / totalReservas) * 100).toFixed(1) : 0;

    const cancelacionesPorCancha = {};
    const cancelacionesPorDia = {};

    canceladas.forEach(reserva => {
      const canchaNombre = reserva.cancha_nombre || 'Sin cancha';
      cancelacionesPorCancha[canchaNombre] = (cancelacionesPorCancha[canchaNombre] || 0) + 1;

      const fecha = moment(reserva.fecha).format('YYYY-MM-DD');
      cancelacionesPorDia[fecha] = (cancelacionesPorDia[fecha] || 0) + 1;
    });

    return {
      tipo: 'cancelaciones',
      totalCanceladas: canceladas.length,
      totalReservas,
      porcentajeCancelacion: parseFloat(porcentajeCancelacion),
      porCancha: Object.entries(cancelacionesPorCancha)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      porDia: Object.entries(cancelacionesPorDia)
        .map(([fecha, cantidad]) => ({ fecha, cantidad }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    };
  };

  const generarReportePagosPendientes = (reservas, pagosPendientes, reservasMap) => {
    const pendientesConReserva = pagosPendientes
      .map(pago => {
        const reserva = reservasMap[pago.reserva_id];
        if (!reserva || reserva.estado === 'cancelada') return null;
        return {
          ...pago,
          reserva,
          diasVencidos: moment().diff(moment(reserva.created_at), 'days')
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.diasVencidos - a.diasVencidos);

    const totalPendiente = pendientesConReserva.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

    const pendientesPorCancha = {};
    pendientesConReserva.forEach(p => {
      const canchaNombre = p.reserva.cancha_nombre || 'Sin cancha';
      pendientesPorCancha[canchaNombre] = (pendientesPorCancha[canchaNombre] || 0) + parseFloat(p.monto || 0);
    });

    return {
      tipo: 'pagos-pendientes',
      totalPendiente,
      cantidadPendientes: pendientesConReserva.length,
      pendientes: pendientesConReserva,
      porCancha: Object.entries(pendientesPorCancha)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
    };
  };

  const formatearMoneda = (monto) => {
    return `S/.${parseFloat(monto).toFixed(2)}`;
  };

  const exportarPDF = async () => {
    if (!datosReporte) return;
    setExportando(true);
    
    try {
      const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const maxWidth = pageWidth - (margin * 2);

    // Título
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const titulo = `Reporte de ${tipoReporte.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    doc.text(titulo, margin, yPos);
    yPos += 12;

    // Período
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`, margin, yPos);
    yPos += 8;
    doc.text(`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`, margin, yPos);
    yPos += 12;

    // Contenido según tipo de reporte
    if (datosReporte.tipo === 'ingresos') {
      // Totales
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMEN', margin, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total de Ingresos: ${formatearMoneda(datosReporte.total)}`, margin + 5, yPos);
      yPos += 7;
      doc.text(`Cantidad de Pagos: ${datosReporte.cantidadPagos}`, margin + 5, yPos);
      yPos += 12;

      // Ingresos por Cancha
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Ingresos por Cancha', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porCancha.forEach((item, idx) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        const texto = `${idx + 1}. ${item.nombre}`;
        const monto = formatearMoneda(item.total);
        doc.text(texto, margin + 5, yPos);
        doc.text(monto, pageWidth - margin - 40, yPos, { align: 'right' });
        yPos += 6;
      });
      yPos += 8;

      // Ingresos por Método
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Ingresos por Método de Pago', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porMetodo.forEach((item, idx) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        const texto = `${idx + 1}. ${item.nombre.charAt(0).toUpperCase() + item.nombre.slice(1)}`;
        const monto = formatearMoneda(item.total);
        doc.text(texto, margin + 5, yPos);
        doc.text(monto, pageWidth - margin - 40, yPos, { align: 'right' });
        yPos += 6;
      });
      yPos += 8;

      // Ingresos por Día
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Ingresos por Día', margin, yPos);
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porDia.forEach((item) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        const fecha = moment(item.fecha).format('DD/MM/YYYY');
        const monto = formatearMoneda(item.total);
        doc.text(fecha, margin + 5, yPos);
        doc.text(monto, pageWidth - margin - 40, yPos, { align: 'right' });
        yPos += 6;
      });
      yPos += 8;

      // Ingresos por Turno
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Ingresos por Turno', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      if (datosReporte.porTurno && datosReporte.porTurno.length > 0) {
        datosReporte.porTurno.forEach((item) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }
          const turnoNombre = item.nombre === 'Día' ? '☀️ Turno Día' : '🌙 Turno Noche';
          const monto = formatearMoneda(item.total);
          doc.text(turnoNombre, margin + 5, yPos);
          doc.text(monto, pageWidth - margin - 40, yPos, { align: 'right' });
          yPos += 7;
        });
      }
    } else if (datosReporte.tipo === 'reservas') {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMEN', margin, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total de Reservas: ${datosReporte.total}`, margin + 5, yPos);
      yPos += 12;

      // Por Cancha
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Reservas por Cancha', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porCancha.forEach((item, idx) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${item.nombre}: ${item.cantidad}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;

      // Por Estado
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Reservas por Estado', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porEstado.forEach((item) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${item.nombre.charAt(0).toUpperCase() + item.nombre.slice(1)}: ${item.cantidad}`, margin + 5, yPos);
        yPos += 6;
      });
    } else if (datosReporte.tipo === 'clientes') {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMEN', margin, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total de Clientes: ${datosReporte.total}`, margin + 5, yPos);
      yPos += 12;

      // Tabla de clientes
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('TOP CLIENTES', margin, yPos);
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      
      // Encabezados
      doc.text('#', margin, yPos);
      doc.text('Cliente', margin + 15, yPos);
      doc.text('DNI', margin + 80, yPos);
      doc.text('Reservas', margin + 110, yPos);
      doc.text('Ingresos', pageWidth - margin - 40, yPos, { align: 'right' });
      yPos += 6;
      
      doc.setFont(undefined, 'normal');
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;
      
      datosReporte.topClientes.forEach((cliente, idx) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
          doc.setFontSize(9);
        }
        doc.text(`${idx + 1}`, margin, yPos);
        doc.text(cliente.nombre.substring(0, 25), margin + 15, yPos);
        doc.text(cliente.dni || '-', margin + 80, yPos);
        doc.text(`${cliente.reservas}`, margin + 110, yPos);
        doc.text(formatearMoneda(cliente.ingresos), pageWidth - margin - 40, yPos, { align: 'right' });
        yPos += 6;
      });
    } else if (datosReporte.tipo === 'comparativo') {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMEN COMPARATIVO', margin, yPos);
      yPos += 12;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Período Actual: ${datosReporte.periodoActual}`, margin, yPos);
      yPos += 6;
      doc.text(`Período Anterior: ${datosReporte.periodoAnterior}`, margin, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('INGRESOS', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Actual: ${formatearMoneda(datosReporte.ingresosActual)}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Anterior: ${formatearMoneda(datosReporte.ingresosAnterior)}`, margin + 5, yPos);
      yPos += 6;
      const variacionIng = datosReporte.variacionIngresos >= 0 ? '+' : '';
      doc.text(`Variación: ${variacionIng}${datosReporte.variacionIngresos}%`, margin + 5, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('RESERVAS', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Actual: ${datosReporte.reservasActual}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Anterior: ${datosReporte.reservasAnterior}`, margin + 5, yPos);
      yPos += 6;
      const variacionRes = datosReporte.variacionReservas >= 0 ? '+' : '';
      doc.text(`Variación: ${variacionRes}${datosReporte.variacionReservas}%`, margin + 5, yPos);
    } else if (datosReporte.tipo === 'horarios-pico') {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Reservas por Día de la Semana', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porDiaSemana.forEach((item) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${item.dia}: ${item.cantidad} reservas`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;

      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Reservas por Hora', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porHora.forEach((item) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${item.hora}: ${item.cantidad} reservas`, margin + 5, yPos);
        yPos += 6;
      });
    } else if (datosReporte.tipo === 'cancelaciones') {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMEN', margin, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Canceladas: ${datosReporte.totalCanceladas}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Total Reservas: ${datosReporte.totalReservas}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Porcentaje de Cancelación: ${datosReporte.porcentajeCancelacion}%`, margin + 5, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Cancelaciones por Cancha', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porCancha.forEach((item) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${item.nombre}: ${item.cantidad}`, margin + 5, yPos);
        yPos += 6;
      });
    } else if (datosReporte.tipo === 'pagos-pendientes') {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESUMEN', margin, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Pendiente: ${formatearMoneda(datosReporte.totalPendiente)}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`Cantidad de Pagos Pendientes: ${datosReporte.cantidadPendientes}`, margin + 5, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Pendientes por Cancha', margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      datosReporte.porCancha.forEach((item) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${item.nombre}: ${formatearMoneda(item.total)}`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 8;

      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('DETALLE DE PAGOS PENDIENTES', margin, yPos);
      yPos += 8;
      doc.setFontSize(8);
      
      // Encabezados
      doc.setFont(undefined, 'bold');
      doc.text('Cliente', margin, yPos);
      doc.text('Cancha', margin + 50, yPos);
      doc.text('Fecha', margin + 90, yPos);
      doc.text('Monto', margin + 125, yPos);
      doc.text('Días', pageWidth - margin - 10, yPos, { align: 'right' });
      yPos += 5;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;
      
      doc.setFont(undefined, 'normal');
      datosReporte.pendientes.forEach((pago) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(pago.reserva.usuario_nombre.substring(0, 15), margin, yPos);
        doc.text(pago.reserva.cancha_nombre.substring(0, 12), margin + 50, yPos);
        doc.text(moment(pago.reserva.fecha).format('DD/MM/YY'), margin + 90, yPos);
        doc.text(formatearMoneda(pago.monto), margin + 125, yPos);
        doc.text(`${pago.diasVencidos}`, pageWidth - margin - 10, yPos, { align: 'right' });
        yPos += 5;
      });
    }

      // Intentar capturar gráficos si existen - esperar más tiempo para que se rendericen completamente
      setTimeout(async () => {
        try {
          // Buscar contenedores de gráficos que incluyen títulos
          const chartContainers = document.querySelectorAll('div[id^="chart-"], .recharts-responsive-container').length > 0
            ? Array.from(document.querySelectorAll('div[id^="chart-"], .recharts-responsive-container'))
            : Array.from(document.querySelectorAll('.recharts-wrapper')).map(wrapper => {
                // Buscar el div padre que contiene el título y el gráfico
                let parent = wrapper.parentElement;
                while (parent && !parent.querySelector('h3')) {
                  parent = parent.parentElement;
                }
                return parent || wrapper.closest('div');
              });
          
          let chartIndex = 0;
          
          for (const container of chartContainers) {
            if (!container || chartIndex >= 3) break; // Máximo 3 gráficos por PDF
            
            try {
              // Asegurar que el SVG esté renderizado
              await new Promise(resolve => setTimeout(resolve, 300));
              
              const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true,
                removeContainer: false,
                onclone: (clonedDoc) => {
                  // Asegurar que los SVG se rendericen en el documento clonado
                  const svgs = clonedDoc.querySelectorAll('svg');
                  svgs.forEach(svg => {
                    svg.setAttribute('style', 'display: block !important;');
                  });
                }
              });
              
              const imgData = canvas.toDataURL('image/png');
              
              if (yPos > pageHeight - 100) {
                doc.addPage();
                yPos = 20;
              }
              
              // No agregar título adicional si el contenedor ya lo tiene
              const hasTitle = container.querySelector('h3');
              if (!hasTitle) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Gráfico Estadístico', margin, yPos);
                yPos += 8;
              }
              
              const imgWidth = pageWidth - (margin * 2);
              const imgHeight = (canvas.height * imgWidth) / canvas.width;
              
              if (imgHeight + yPos > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
              }
              
              doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 100));
              yPos += Math.min(imgHeight, 100) + 10;
              chartIndex++;
            } catch (err) {
              console.log('Error capturando gráfico:', err);
            }
          }
        } catch (err) {
          console.log('Error procesando gráficos:', err);
        }
        
        doc.save(`reporte-${tipoReporte}-${moment().format('YYYY-MM-DD')}.pdf`);
        swalConfig.toastSuccess('PDF generado', 'El reporte se ha descargado correctamente');
        setExportando(false);
      }, 1500);
    } catch (error) {
      console.error('Error generando PDF:', error);
      setExportando(false);
      swalConfig.toastError('Error', 'No se pudo generar el PDF');
    }
  };

  const exportarExcel = async () => {
    if (!datosReporte) return;
    setExportando(true);
    
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sistema de Gestión de Canchas';
      wb.created = new Date();
      
      // Variables para almacenar referencias a hojas (para insertar gráficos)
      let wsCancha = null;
      let wsMetodo = null;
      let wsDia = null;
      let wsEstado = null;
      let wsHora = null;
      let wsResumen = null;
      let wsClientes = null;
      let wsDetalle = null;
      let ws = null;
    
      // Función helper para crear hojas con formato
      const crearHojaConFormato = (nombre, titulo, headers, datos, tieneGrafico = false) => {
        const ws = wb.addWorksheet(nombre);
        
        // Título
        const tituloRow = ws.addRow([titulo]);
        tituloRow.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        tituloRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF22C55E' }
        };
        tituloRow.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(1, 1, 1, headers.length);
        
        // Período
        ws.addRow([`Período: ${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`]);
        ws.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
        ws.addRow([]);
        
        // Headers
        const headerRow = ws.addRow(headers);
        headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Datos
        datos.forEach(row => {
          const dataRow = ws.addRow(row);
          dataRow.alignment = { vertical: 'middle' };
          
          // Formato para columnas numéricas
          row.forEach((cell, idx) => {
            if (typeof cell === 'number' && idx > 0) {
              dataRow.getCell(idx + 1).numFmt = idx === headers.length - 1 && headers[headers.length - 1].includes('S/.') 
                ? '"S/."#,##0.00' 
                : '#,##0';
            }
          });
        });
        
        // Ajustar anchos de columnas
        headers.forEach((header, idx) => {
          ws.getColumn(idx + 1).width = Math.max(header.length + 2, 15);
        });
        
        // Bordes
        const dataRange = ws.getCell(headerRow.number, 1).address + ':' + 
                         ws.getCell(tituloRow.number + 3 + datos.length, headers.length).address;
        ws.getRow(headerRow.number).border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        datos.forEach((_, idx) => {
          const row = ws.getRow(headerRow.number + 1 + idx);
          row.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
        });
        
        return ws;
      };
    
    if (datosReporte.tipo === 'ingresos') {
      // Hoja Resumen
      wsResumen = wb.addWorksheet('Resumen');
      wsResumen.addRow(['REPORTE DE INGRESOS']).font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      wsResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      wsResumen.getRow(1).alignment = { horizontal: 'center' };
      wsResumen.mergeCells(1, 1, 1, 2);
      wsResumen.addRow([`Período: ${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`]);
      wsResumen.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Total de Ingresos', datosReporte.total]).getCell(2).numFmt = '"S/."#,##0.00';
      wsResumen.addRow(['Cantidad de Pagos', datosReporte.cantidadPagos]);
      wsResumen.getColumn(1).width = 25;
      wsResumen.getColumn(2).width = 20;

      // Hoja Por Cancha con gráfico
      wsCancha = crearHojaConFormato(
        'Por Cancha',
        'INGRESOS POR CANCHA',
        ['Cancha', 'Ingresos (S/.)'],
        datosReporte.porCancha.map(item => [item.nombre, item.total]),
        true
      );
      
      // Los gráficos se agregarán como imágenes capturadas de la página

      // Hoja Por Método con gráfico de torta
      wsMetodo = crearHojaConFormato(
        'Por Método',
        'INGRESOS POR MÉTODO DE PAGO',
        ['Método', 'Ingresos (S/.)'],
        datosReporte.porMetodo.map(item => [item.nombre.charAt(0).toUpperCase() + item.nombre.slice(1), item.total]),
        true
      );
      
      // Hoja Por Día con gráfico de línea
      wsDia = crearHojaConFormato(
        'Por Día',
        'INGRESOS POR DÍA',
        ['Fecha', 'Ingresos (S/.)'],
        datosReporte.porDia.map(item => [moment(item.fecha).format('DD/MM/YYYY'), item.total]),
        true
      );

    } else if (datosReporte.tipo === 'reservas') {
      wsResumen = wb.addWorksheet('Resumen');
      wsResumen.addRow(['REPORTE DE RESERVAS']).font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      wsResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      wsResumen.getRow(1).alignment = { horizontal: 'center' };
      wsResumen.mergeCells(1, 1, 1, 2);
      wsResumen.addRow([`Período: ${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`]);
      wsResumen.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Total de Reservas', datosReporte.total]);
      wsResumen.getColumn(1).width = 25;
      wsResumen.getColumn(2).width = 20;

      wsCancha = crearHojaConFormato(
        'Por Cancha',
        'RESERVAS POR CANCHA',
        ['Cancha', 'Cantidad'],
        datosReporte.porCancha.map(item => [item.nombre, item.cantidad])
      );

      wsEstado = crearHojaConFormato(
        'Por Estado',
        'RESERVAS POR ESTADO',
        ['Estado', 'Cantidad'],
        datosReporte.porEstado.map(item => [item.nombre.charAt(0).toUpperCase() + item.nombre.slice(1), item.cantidad])
      );

      wsDia = crearHojaConFormato(
        'Por Día',
        'RESERVAS POR DÍA',
        ['Fecha', 'Cantidad'],
        datosReporte.porDia.map(item => [moment(item.fecha).format('DD/MM/YYYY'), item.cantidad])
      );

    } else if (datosReporte.tipo === 'clientes') {
      wsResumen = wb.addWorksheet('Resumen');
      wsResumen.addRow(['REPORTE DE CLIENTES']).font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      wsResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
      wsResumen.getRow(1).alignment = { horizontal: 'center' };
      wsResumen.mergeCells(1, 1, 1, 2);
      wsResumen.addRow([`Período: ${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`]);
      wsResumen.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Total de Clientes', datosReporte.total]);
      wsResumen.getColumn(1).width = 25;
      wsResumen.getColumn(2).width = 20;

      wsClientes = crearHojaConFormato(
        'Top Clientes',
        'TOP CLIENTES',
        ['#', 'Cliente', 'DNI', 'Reservas', 'Ingresos (S/.)'],
        datosReporte.topClientes.map((cliente, idx) => [
          idx + 1,
          cliente.nombre,
          cliente.dni,
          cliente.reservas,
          cliente.ingresos
        ])
      );

    } else if (datosReporte.tipo === 'comparativo') {
      ws = wb.addWorksheet('Comparativo');
      ws.addRow(['REPORTE COMPARATIVO']).font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
      ws.getRow(1).alignment = { horizontal: 'center' };
      ws.mergeCells(1, 1, 1, 4);
      ws.addRow([`Período Actual: ${datosReporte.periodoActual}`]);
      ws.addRow([`Período Anterior: ${datosReporte.periodoAnterior}`]);
      ws.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
      ws.addRow([]);
      
      const headerRow = ws.addRow(['MÉTRICA', 'PERÍODO ACTUAL', 'PERÍODO ANTERIOR', 'VARIACIÓN (%)']);
      headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      headerRow.alignment = { horizontal: 'center' };
      
      const ingRow = ws.addRow(['Ingresos', datosReporte.ingresosActual, datosReporte.ingresosAnterior, datosReporte.variacionIngresos + '%']);
      ingRow.getCell(2).numFmt = '"S/."#,##0.00';
      ingRow.getCell(3).numFmt = '"S/."#,##0.00';
      
      const resRow = ws.addRow(['Reservas', datosReporte.reservasActual, datosReporte.reservasAnterior, datosReporte.variacionReservas + '%']);
      
      ws.columns.forEach(col => col.width = 20);

    } else if (datosReporte.tipo === 'horarios-pico') {
      wsResumen = wb.addWorksheet('Resumen');
      wsResumen.addRow(['REPORTE DE HORARIOS PICO']).font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      wsResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06B6D4' } };
      wsResumen.getRow(1).alignment = { horizontal: 'center' };
      wsResumen.mergeCells(1, 1, 1, 2);
      wsResumen.addRow([`Período: ${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`]);
      wsResumen.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
      wsResumen.getColumn(1).width = 25;
      wsResumen.getColumn(2).width = 20;

      wsDia = crearHojaConFormato(
        'Por Día Semana',
        'RESERVAS POR DÍA DE LA SEMANA',
        ['Día', 'Cantidad'],
        datosReporte.porDiaSemana.map(item => [item.dia, item.cantidad])
      );

      wsHora = crearHojaConFormato(
        'Por Hora',
        'RESERVAS POR HORA',
        ['Hora', 'Cantidad'],
        datosReporte.porHora.map(item => [item.hora, item.cantidad])
      );

    } else if (datosReporte.tipo === 'cancelaciones') {
      wsResumen = wb.addWorksheet('Resumen');
      wsResumen.addRow(['REPORTE DE CANCELACIONES']).font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      wsResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
      wsResumen.getRow(1).alignment = { horizontal: 'center' };
      wsResumen.mergeCells(1, 1, 1, 2);
      wsResumen.addRow([`Período: ${moment(fechaInicio).format('DD/MM/YYYY')} - ${moment(fechaFin).format('DD/MM/YYYY')}`]);
      wsResumen.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Total Canceladas', datosReporte.totalCanceladas]);
      wsResumen.addRow(['Total Reservas', datosReporte.totalReservas]);
      wsResumen.addRow(['Porcentaje de Cancelación', datosReporte.porcentajeCancelacion + '%']);
      wsResumen.getColumn(1).width = 25;
      wsResumen.getColumn(2).width = 20;

      wsCancha = crearHojaConFormato(
        'Por Cancha',
        'CANCELACIONES POR CANCHA',
        ['Cancha', 'Cantidad'],
        datosReporte.porCancha.map(item => [item.nombre, item.cantidad])
      );

      wsDia = crearHojaConFormato(
        'Por Día',
        'CANCELACIONES POR DÍA',
        ['Fecha', 'Cantidad'],
        datosReporte.porDia.map(item => [moment(item.fecha).format('DD/MM/YYYY'), item.cantidad])
      );

    } else if (datosReporte.tipo === 'pagos-pendientes') {
      wsResumen = wb.addWorksheet('Resumen');
      wsResumen.addRow(['REPORTE DE PAGOS PENDIENTES']).font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      wsResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
      wsResumen.getRow(1).alignment = { horizontal: 'center' };
      wsResumen.mergeCells(1, 1, 1, 2);
      wsResumen.addRow([`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`]);
      wsResumen.addRow([]);
      wsResumen.addRow(['Total Pendiente', datosReporte.totalPendiente]).getCell(2).numFmt = '"S/."#,##0.00';
      wsResumen.addRow(['Cantidad de Pagos Pendientes', datosReporte.cantidadPendientes]);
      wsResumen.getColumn(1).width = 25;
      wsResumen.getColumn(2).width = 20;

      const       wsCancha = crearHojaConFormato(
        'Por Cancha',
        'PENDIENTES POR CANCHA',
        ['Cancha', 'Total Pendiente (S/.)'],
        datosReporte.porCancha.map(item => [item.nombre, item.total])
      );

      wsDetalle = crearHojaConFormato(
        'Detalle',
        'DETALLE DE PAGOS PENDIENTES',
        ['Cliente', 'Cancha', 'Fecha Reserva', 'Monto (S/.)', 'Días Vencidos'],
        datosReporte.pendientes.map(pago => [
          pago.reserva.usuario_nombre,
          pago.reserva.cancha_nombre,
          moment(pago.reserva.fecha).format('DD/MM/YYYY'),
          pago.monto,
          pago.diasVencidos
        ])
      );
    }

      // Capturar gráficos visibles e insertarlos como imágenes en las hojas
      await new Promise(resolve => setTimeout(resolve, 1500)); // Esperar más tiempo para que los gráficos se rendericen completamente
      
      try {
        // Buscar contenedores completos que incluyen títulos y gráficos
        const chartContainers = [];
        
        // Buscar por IDs específicos primero
        const idContainers = document.querySelectorAll('[id^="chart-"]');
        idContainers.forEach(el => chartContainers.push(el));
        
        // Si no hay IDs, buscar contenedores con ResponsiveContainer que tengan título
        if (chartContainers.length === 0) {
          const responsiveContainers = document.querySelectorAll('.recharts-responsive-container');
          responsiveContainers.forEach(container => {
            let parent = container.parentElement;
            // Buscar el div padre que contiene el título (h3)
            while (parent && !parent.querySelector('h3') && parent !== document.body) {
              parent = parent.parentElement;
            }
            if (parent && parent.querySelector('h3')) {
              chartContainers.push(parent);
            } else {
              chartContainers.push(container);
            }
          });
        }
        
        if (chartContainers.length > 0) {
          for (let i = 0; i < Math.min(chartContainers.length, 4); i++) {
            try {
              const container = chartContainers[i];
              if (!container) continue;
              
              // Asegurar que los SVG estén renderizados
              await new Promise(resolve => setTimeout(resolve, 300));
              
              const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true,
                removeContainer: false,
                onclone: (clonedDoc) => {
                  // Asegurar que los SVG se rendericen correctamente en el documento clonado
                  const svgs = clonedDoc.querySelectorAll('svg');
                  svgs.forEach(svg => {
                    svg.setAttribute('style', 'display: block !important; opacity: 1 !important;');
                    // Forzar renderizado de texto en SVG
                    const textElements = svg.querySelectorAll('text');
                    textElements.forEach(text => {
                      text.setAttribute('style', 'display: block !important; opacity: 1 !important;');
                    });
                  });
                  
                  // Asegurar que los elementos del gráfico sean visibles
                  const paths = clonedDoc.querySelectorAll('path, rect, circle, line');
                  paths.forEach(el => {
                    el.setAttribute('style', 'display: block !important; opacity: 1 !important;');
                  });
                }
              });
              
              const base64Image = canvas.toDataURL('image/png');
              
              // Determinar en qué hoja insertar según el tipo de reporte
              let targetSheet = null;
              if (datosReporte.tipo === 'ingresos') {
                if (i === 0) targetSheet = wsCancha;
                else if (i === 1) targetSheet = wsMetodo;
                else if (i === 2) targetSheet = wsDia;
              } else if (datosReporte.tipo === 'reservas') {
                if (i === 0) targetSheet = wsCancha;
                else if (i === 1) targetSheet = wsEstado;
                else if (i === 2) targetSheet = wsDia;
              } else {
                targetSheet = Object.values(wb.worksheets).find(ws => 
                  ws.name !== 'Resumen' && ws !== wsResumen
                ) || wb.worksheets[1];
              }
              
              if (targetSheet) {
                const imageId = wb.addImage({
                  base64: base64Image,
                  extension: 'png',
                });
                
                const lastRow = targetSheet.lastRow?.number || targetSheet.rowCount;
                targetSheet.addImage(imageId, {
                  tl: { col: 0, row: lastRow + 2 },
                  ext: { width: 600, height: 400 }
                });
              }
            } catch (imgErr) {
              console.log('Error capturando gráfico:', imgErr);
            }
          }
        }
      } catch (chartErr) {
        console.log('Error procesando gráficos:', chartErr);
      }

      // Guardar archivo
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${tipoReporte}-${moment().format('YYYY-MM-DD')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      swalConfig.toastSuccess('Excel generado', 'El reporte se ha descargado correctamente');
      setExportando(false);
    } catch (error) {
      console.error('Error generando Excel:', error);
      setExportando(false);
      swalConfig.toastError('Error', 'No se pudo generar el Excel');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>
          <p className="text-gray-600 mt-1">Genera reportes detallados de ingresos, reservas y más</p>
        </div>
        {datosReporte && (
          <div className="flex gap-2">
            <Button onClick={exportarPDF} variant="secondary" size="sm" disabled={exportando}>
              {exportando ? '⏳ Generando...' : '📄 Exportar PDF'}
            </Button>
            <Button onClick={exportarExcel} variant="secondary" size="sm" disabled={exportando}>
              {exportando ? '⏳ Generando...' : '📊 Exportar Excel'}
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte</label>
            <FormSelect
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value)}
              options={[
                { value: 'ingresos', label: '📊 Ingresos' },
                { value: 'reservas', label: '📋 Reservas' },
                { value: 'clientes', label: '👥 Clientes' },
                { value: 'comparativo', label: '📈 Comparativo' },
                { value: 'horarios-pico', label: '⏰ Horarios Pico' },
                { value: 'cancelaciones', label: '❌ Cancelaciones' },
                { value: 'pagos-pendientes', label: '💳 Pagos Pendientes' }
              ]}
            />
          </div>

          {tipoReporte === 'comparativo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
              <FormSelect
                value={periodoComparativo}
                onChange={(e) => setPeriodoComparativo(e.target.value)}
                options={[
                  { value: 'mes', label: 'Mes Anterior' },
                  { value: 'semana', label: 'Semana Anterior' }
                ]}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cancha</label>
            <FormSelect
              value={canchaSeleccionada}
              onChange={(e) => setCanchaSeleccionada(e.target.value)}
              options={[
                { value: 'todas', label: 'Todas las canchas' },
                ...canchas.map(c => ({ value: c.id.toString(), label: c.nombre }))
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
            <FormInput
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
            <FormInput
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Reporte */}
      {loading ? (
        <Card className="p-12 text-center">
          <div className="text-gray-500">Generando reporte...</div>
        </Card>
      ) : datosReporte ? (
        <div className="space-y-6">
          {/* Reporte de Ingresos */}
          {datosReporte.tipo === 'ingresos' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">📊 Reporte de Ingresos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Ingresos</p>
                  <p className="text-3xl font-bold text-green-600">{formatearMoneda(datosReporte.total)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Cantidad de Pagos</p>
                  <p className="text-3xl font-bold text-blue-600">{datosReporte.cantidadPagos}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div id="chart-ingresos-cancha">
                  <h3 className="text-lg font-semibold mb-3">Ingresos por Cancha</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datosReporte.porCancha}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatearMoneda(value)} />
                      <Bar dataKey="total" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div id="chart-ingresos-metodo">
                  <h3 className="text-lg font-semibold mb-3">Ingresos por Método de Pago</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={datosReporte.porMetodo}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ nombre, percent }) => `${nombre}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {datosReporte.porMetodo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatearMoneda(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div id="chart-ingresos-dia">
                  <h3 className="text-lg font-semibold mb-3">Ingresos por Día</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosReporte.porDia}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tickFormatter={(value) => moment(value).format('DD/MM')} />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => moment(value).format('DD/MM/YYYY')}
                        formatter={(value) => formatearMoneda(value)} 
                      />
                      <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div id="chart-ingresos-turno">
                  <h3 className="text-lg font-semibold mb-3">Ingresos por Turno</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={datosReporte.porTurno}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ nombre, percent }) => `${nombre}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {datosReporte.porTurno.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : '#1e40af'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatearMoneda(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Turno Día</p>
                      <p className="text-xl font-bold text-yellow-600">{formatearMoneda(datosReporte.porTurno[0]?.total || 0)}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Turno Noche</p>
                      <p className="text-xl font-bold text-blue-600">{formatearMoneda(datosReporte.porTurno[1]?.total || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Reporte de Reservas */}
          {datosReporte.tipo === 'reservas' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">📋 Reporte de Reservas</h2>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600">Total de Reservas</p>
                <p className="text-3xl font-bold text-blue-600">{datosReporte.total}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Reservas por Cancha</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datosReporte.porCancha}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Reservas por Estado</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={datosReporte.porEstado}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ nombre, percent }) => `${nombre}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cantidad"
                      >
                        {datosReporte.porEstado.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          )}

          {/* Reporte de Clientes */}
          {datosReporte.tipo === 'clientes' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">👥 Reporte de Clientes</h2>
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600">Total de Clientes Únicos</p>
                <p className="text-3xl font-bold text-purple-600">{datosReporte.total}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">#</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Cliente</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">DNI</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Reservas</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">Total Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosReporte.topClientes.map((cliente, idx) => (
                      <tr key={cliente.id} className="border-b">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium">{cliente.nombre}</td>
                        <td className="px-4 py-2">{cliente.dni}</td>
                        <td className="px-4 py-2 text-right">{cliente.reservas}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-600">{formatearMoneda(cliente.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Reporte Comparativo */}
          {datosReporte.tipo === 'comparativo' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">📈 Reporte Comparativo</h2>
              <div className="mb-6">
                <p className="text-sm text-gray-600">Período Actual: {datosReporte.periodoActual}</p>
                <p className="text-sm text-gray-600">Período Anterior: {datosReporte.periodoAnterior}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Ingresos Actual</p>
                  <p className="text-3xl font-bold text-green-600">{formatearMoneda(datosReporte.ingresosActual)}</p>
                  <p className={`text-sm mt-2 ${datosReporte.variacionIngresos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {datosReporte.variacionIngresos >= 0 ? '↑' : '↓'} {Math.abs(datosReporte.variacionIngresos)}% vs anterior
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Ingresos Anterior</p>
                  <p className="text-3xl font-bold text-blue-600">{formatearMoneda(datosReporte.ingresosAnterior)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Reservas Actual</p>
                  <p className="text-3xl font-bold text-green-600">{datosReporte.reservasActual}</p>
                  <p className={`text-sm mt-2 ${datosReporte.variacionReservas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {datosReporte.variacionReservas >= 0 ? '↑' : '↓'} {Math.abs(datosReporte.variacionReservas)}% vs anterior
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Reservas Anterior</p>
                  <p className="text-3xl font-bold text-blue-600">{datosReporte.reservasAnterior}</p>
                </div>
              </div>

              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { periodo: 'Actual', ingresos: datosReporte.ingresosActual, reservas: datosReporte.reservasActual },
                    { periodo: 'Anterior', ingresos: datosReporte.ingresosAnterior, reservas: datosReporte.reservasAnterior }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" />
                    <Bar dataKey="reservas" fill="#3b82f6" name="Reservas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Reporte Horarios Pico */}
          {datosReporte.tipo === 'horarios-pico' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">⏰ Horarios Pico</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Reservas por Día de la Semana</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datosReporte.porDiaSemana}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Reservas por Hora</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datosReporte.porHora}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hora" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          )}

          {/* Reporte Cancelaciones */}
          {datosReporte.tipo === 'cancelaciones' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">❌ Reporte de Cancelaciones</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Canceladas</p>
                  <p className="text-3xl font-bold text-red-600">{datosReporte.totalCanceladas}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Reservas</p>
                  <p className="text-3xl font-bold text-blue-600">{datosReporte.totalReservas}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">% Cancelación</p>
                  <p className="text-3xl font-bold text-orange-600">{datosReporte.porcentajeCancelacion}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Cancelaciones por Cancha</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datosReporte.porCancha}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Cancelaciones por Día</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosReporte.porDia}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tickFormatter={(value) => moment(value).format('DD/MM')} />
                      <YAxis />
                      <Tooltip labelFormatter={(value) => moment(value).format('DD/MM/YYYY')} />
                      <Line type="monotone" dataKey="cantidad" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          )}

          {/* Reporte Pagos Pendientes */}
          {datosReporte.tipo === 'pagos-pendientes' && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">💳 Pagos Pendientes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Pendiente</p>
                  <p className="text-3xl font-bold text-orange-600">{formatearMoneda(datosReporte.totalPendiente)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Cantidad de Pagos Pendientes</p>
                  <p className="text-3xl font-bold text-red-600">{datosReporte.cantidadPendientes}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Pendientes por Cancha</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={datosReporte.porCancha}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatearMoneda(value)} />
                    <Bar dataKey="total" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Detalle de Pagos Pendientes</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Cliente</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Cancha</th>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Fecha Reserva</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Monto</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Días Vencidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosReporte.pendientes.slice(0, 20).map((pago, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-2">{pago.reserva.usuario_nombre}</td>
                          <td className="px-4 py-2">{pago.reserva.cancha_nombre}</td>
                          <td className="px-4 py-2">{moment(pago.reserva.fecha).format('DD/MM/YYYY')}</td>
                          <td className="px-4 py-2 text-right font-medium text-orange-600">{formatearMoneda(pago.monto)}</td>
                          <td className={`px-4 py-2 text-right font-bold ${pago.diasVencidos > 3 ? 'text-red-600' : 'text-yellow-600'}`}>
                            {pago.diasVencidos} días
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-gray-500">Selecciona un tipo de reporte y ajusta los filtros para generar el reporte</div>
        </Card>
      )}
    </div>
  );
};

export default AdminReportes;
