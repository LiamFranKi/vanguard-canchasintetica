const nodemailer = require('nodemailer');
const { query } = require('../database/connection');
const moment = require('moment');

let transporter = null;

const initTransporter = () => {
  if (!transporter && process.env.EMAIL_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return transporter;
};

const getEmailTemplate = async (tipo, variables = {}) => {
  const configs = await query(
    `SELECT clave, valor FROM configuraciones WHERE clave IN ($1, $2)`,
    [`email_${tipo}_asunto`, `email_${tipo}_cuerpo`]
  );

  let asunto = '';
  let cuerpo = '';

  configs.rows.forEach(row => {
    if (row.clave === `email_${tipo}_asunto`) {
      asunto = row.valor || '';
    } else if (row.clave === `email_${tipo}_cuerpo`) {
      cuerpo = row.valor || '';
    }
  });

  // Reemplazar variables
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    asunto = asunto.replace(regex, variables[key]);
    cuerpo = cuerpo.replace(regex, variables[key]);
  });

  return { asunto, cuerpo };
};

let cachedCompanyName = null;
let lastCompanyNameFetch = null;

const getCompanyName = async () => {
  const now = Date.now();
  // refrescar cada 10 minutos como máximo
  if (cachedCompanyName && lastCompanyNameFetch && (now - lastCompanyNameFetch < 10 * 60 * 1000)) {
    return cachedCompanyName;
  }

  try {
    const result = await query(
      "SELECT valor FROM configuraciones WHERE clave = 'nombre_empresa'"
    );
    const nombre = result.rows[0]?.valor || 'Canchas Sintéticas';
    cachedCompanyName = nombre;
    lastCompanyNameFetch = now;
    return nombre;
  } catch (error) {
    console.error('Error obteniendo nombre de la empresa para emails:', error);
    return 'Canchas Sintéticas';
  }
};

const getEmailStyles = () => {
  return `
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
        padding: 30px;
        text-align: center;
        border-radius: 10px 10px 0 0;
        margin: -20px -20px 20px -20px;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
      }
      .content {
        padding: 20px 0;
      }
      .footer {
        text-align: center;
        padding: 20px 0;
        color: #666;
        font-size: 12px;
        border-top: 1px solid #eee;
        margin-top: 20px;
      }
      .button {
        display: inline-block;
        padding: 12px 30px;
        background-color: #22c55e;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        margin: 20px 0;
      }
      .info-box {
        background-color: #f0f9ff;
        border-left: 4px solid #22c55e;
        padding: 15px;
        margin: 20px 0;
      }
    </style>
  `;
};

const sendEmail = async (to, subject, html) => {
  const emailTransporter = initTransporter();
  
  if (!emailTransporter) {
    console.warn('Email transporter no configurado');
    return false;
  }

  try {
    const companyName = await getCompanyName();

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        ${getEmailStyles()}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚽ ${companyName}</h1>
          </div>
          <div class="content">
            ${html}
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromString = emailFrom.includes('<') 
      ? emailFrom.replace(/^[^<]*/, `${companyName} `)
      : `${companyName} <${emailFrom}>`;

    await emailTransporter.sendMail({
      from: fromString,
      to,
      subject,
      html: fullHtml
    });

    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};

const sendWelcomeEmail = async (email, nombre, dni) => {
  const { asunto, cuerpo } = await getEmailTemplate('bienvenida', {
    nombre,
    dni
  });

  const companyName = await getCompanyName();

  const html = `
    <h2>¡Bienvenido a ${companyName}, ${nombre}!</h2>
    <p>Tu cuenta ha sido creada exitosamente.</p>
    <div class="info-box">
      <p><strong>Usuario:</strong> ${dni}</p>
      <p><strong>Contraseña inicial:</strong> ${dni}</p>
      <p><em>Por favor cambia tu contraseña después del primer acceso.</em></p>
    </div>
    ${cuerpo}
  `;

  return await sendEmail(email, asunto || `Bienvenido a ${companyName}`, html);
};

const sendReservationEmail = async (email, nombre, reserva) => {
  const { asunto, cuerpo } = await getEmailTemplate('reserva', {
    nombre,
    cancha: reserva.cancha_nombre,
    fecha: reserva.fecha,
    hora_inicio: reserva.hora_inicio,
    hora_fin: reserva.hora_fin
  });

  // Obtener días máximos para pago (si existe configuración)
  let diasMaxPago = 3;
  try {
    const config = await query(
      "SELECT valor FROM configuraciones WHERE clave = 'dias_max_pago'"
    );
    if (config.rows.length > 0) {
      const dias = parseInt(config.rows[0].valor, 10);
      if (!isNaN(dias)) diasMaxPago = dias;
    }
  } catch (e) {
    console.warn('No se pudo obtener dias_max_pago para email:', e.message);
  }

  const fechaFormateada = moment(reserva.fecha).format('DD/MM/YYYY');

  // HTML del correo de confirmación (sin duplicar el cuerpo del template)
  const html = `
    <h2>Reserva Confirmada ✅</h2>
    <p>Hola ${nombre},</p>
    <p>Tu reserva ha sido confirmada. Estos son los detalles:</p>
    <div class="info-box">
      <p><strong>Cancha:</strong> ${reserva.cancha_nombre}</p>
      <p><strong>Fecha:</strong> ${fechaFormateada}</p>
      <p><strong>Horario:</strong> ${reserva.hora_inicio} - ${reserva.hora_fin}</p>
      <p><strong>Costo:</strong> S/.${Number(reserva.costo_total || 0).toFixed(2)}</p>
    </div>
    <p><strong>Importante:</strong> Tienes hasta <strong>${diasMaxPago} día(s)</strong> para realizar el pago de tu reserva, 
    de lo contrario se cancelará automáticamente y el horario volverá a estar disponible.</p>
  `;

  return await sendEmail(email, asunto || `Reserva Confirmada - ${reserva.cancha_nombre}`, html);
};

const sendReservationCancelledEmail = async (email, nombre, reserva) => {
  const { asunto, cuerpo } = await getEmailTemplate('reserva_cancelada', {
    nombre,
    cancha: reserva.cancha_nombre,
    fecha: moment(reserva.fecha).format('DD/MM/YYYY'),
    hora_inicio: reserva.hora_inicio,
    hora_fin: reserva.hora_fin
  });

  const html = `
    <h2>Reserva Cancelada ❌</h2>
    <p>Hola ${nombre},</p>
    <p>Tu reserva ha sido cancelada. Estos eran los detalles:</p>
    <div class="info-box">
      <p><strong>Cancha:</strong> ${reserva.cancha_nombre}</p>
      <p><strong>Fecha:</strong> ${moment(reserva.fecha).format('DD/MM/YYYY')}</p>
      <p><strong>Horario:</strong> ${reserva.hora_inicio} - ${reserva.hora_fin}</p>
      <p><strong>Costo:</strong> S/.${Number(reserva.costo_total || 0).toFixed(2)}</p>
    </div>
    ${cuerpo ? `<p>${cuerpo}</p>` : ''}
  `;

  return await sendEmail(email, asunto || `Reserva Cancelada - ${reserva.cancha_nombre}`, html);
};

const sendPaymentEmail = async (email, nombre, reserva, pago) => {
  const { asunto, cuerpo } = await getEmailTemplate('pago', {
    nombre,
    cancha: reserva.cancha_nombre,
    fecha: moment(reserva.fecha).format('DD/MM/YYYY'),
    hora_inicio: reserva.hora_inicio,
    hora_fin: reserva.hora_fin,
    monto: Number(pago.monto || 0).toFixed(2),
    metodo: pago.metodo_pago
  });

  const html = `
    <h2>Pago Registrado 💳</h2>
    <p>Hola ${nombre},</p>
    <p>Hemos registrado tu pago para la siguiente reserva:</p>
    <div class="info-box">
      <p><strong>Cancha:</strong> ${reserva.cancha_nombre}</p>
      <p><strong>Fecha:</strong> ${moment(reserva.fecha).format('DD/MM/YYYY')}</p>
      <p><strong>Horario:</strong> ${reserva.hora_inicio} - ${reserva.hora_fin}</p>
      <p><strong>Monto:</strong> S/.${Number(pago.monto || 0).toFixed(2)}</p>
      <p><strong>Método:</strong> ${pago.metodo_pago}</p>
    </div>
    ${cuerpo ? `<p>${cuerpo}</p>` : ''}
  `;

  return await sendEmail(email, asunto || `Pago Registrado - ${reserva.cancha_nombre}`, html);
};

const sendReminderEmail = async (email, nombre, reserva) => {
  const { asunto, cuerpo } = await getEmailTemplate('recordatorio', {
    nombre,
    cancha: reserva.cancha_nombre,
    fecha: moment(reserva.fecha).format('DD/MM/YYYY'),
    hora_inicio: reserva.hora_inicio,
    hora_fin: reserva.hora_fin
  });

  const html = `
    <h2>Recordatorio de tu reserva de hoy ⏰</h2>
    <p>Hola ${nombre},</p>
    <p>Te recordamos que <strong>hoy</strong> tienes una reserva activa:</p>
    <div class="info-box">
      <p><strong>Cancha:</strong> ${reserva.cancha_nombre}</p>
      <p><strong>Fecha:</strong> ${moment(reserva.fecha).format('DD/MM/YYYY')}</p>
      <p><strong>Horario:</strong> ${reserva.hora_inicio} - ${reserva.hora_fin}</p>
      <p><strong>Costo:</strong> S/.${Number(reserva.costo_total || 0).toFixed(2)}</p>
    </div>
    ${cuerpo ? `<p>${cuerpo}</p>` : ''}
  `;

  return await sendEmail(email, asunto || `Recordatorio de Reserva - ${reserva.cancha_nombre}`, html);
};

const sendNewReservationNotificationToStaff = async (email, nombre, reserva, usuarioNombre) => {
  const fechaFormateada = moment(reserva.fecha).format('DD/MM/YYYY');
  
  const html = `
    <h2>Nueva Reserva 📅</h2>
    <p>Hola ${nombre},</p>
    <p>Se ha creado una nueva reserva en la cancha asignada:</p>
    <div class="info-box">
      <p><strong>Cancha:</strong> ${reserva.cancha_nombre}</p>
      <p><strong>Cliente:</strong> ${usuarioNombre}</p>
      <p><strong>Fecha:</strong> ${fechaFormateada}</p>
      <p><strong>Horario:</strong> ${reserva.hora_inicio} - ${reserva.hora_fin}</p>
      <p><strong>Costo:</strong> S/.${Number(reserva.costo_total || 0).toFixed(2)}</p>
    </div>
    <p><strong>Nota:</strong> Esta reserva está pendiente de pago. El cliente tiene un plazo determinado para realizar el pago.</p>
  `;

  const companyName = await getCompanyName();
  return await sendEmail(email, `Nueva Reserva - ${reserva.cancha_nombre} - ${fechaFormateada}`, html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendReservationEmail,
  sendReservationCancelledEmail,
  sendPaymentEmail,
  sendReminderEmail,
  sendNewReservationNotificationToStaff
};

