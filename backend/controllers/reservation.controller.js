const reservationModel = require('../models/reservation.model');
const { RESERVATION_STATES, validateReservation } = require('../domain');
const { readBody, sendJson } = require('../utils/http');
const { sendReservationEmail, validateEmailContent } = require('../services/email.service');

async function create(req, res) {
  const body = await readBody(req);
  if (!validateReservation(body)) {
    return sendJson(res, 400, { error: 'Los datos de la solicitud no son válidos.' });
  }
  return sendJson(res, 201, await reservationModel.create(body));
}

async function getAll(req, res) {
  return sendJson(res, 200, await reservationModel.getAll());
}

async function getById(req, res, id) {
  return sendJson(res, 200, await reservationModel.getById(id));
}

async function getEmails(req, res, id) {
  return sendJson(res, 200, await reservationModel.getEmails(id));
}

async function sendEmail(req, res, id) {
  const body = await readBody(req);
  if (!validateEmailContent(body)) {
    return sendJson(res, 400, {
      error: 'El asunto, título o mensaje no son válidos.'
    });
  }

  const reservation = await reservationModel.getById(id);
  const emailId = await reservationModel.createEmail(id, {
    destinatario: reservation.correoContacto,
    asunto: body.asunto.trim(),
    titulo: body.titulo.trim(),
    mensaje: body.mensaje.trim()
  });

  let result;
  try {
    result = await sendReservationEmail(reservation, id, body);
  } catch (error) {
    await reservationModel.updateEmail(id, emailId, { estado: 'fallido' });
    if (error.status === 503) throw error;
    throw Object.assign(
      new Error('Gmail no pudo enviar el correo. Verifica la configuración de la cuenta y SMTP.'),
      { status: 502 }
    );
  }

  await reservationModel.updateEmail(id, emailId, {
    estado: 'enviado',
    messageId: result.messageId
  });
  return sendJson(res, 201, { id: emailId, estado: 'enviado' });
}

async function updateState(req, res, id) {
  const body = await readBody(req);
  if (!RESERVATION_STATES.has(body.estado) || Object.keys(body).some(key => key !== 'estado')) {
    return sendJson(res, 400, { error: 'El estado de la reserva no es válido.' });
  }
  return sendJson(res, 200, await reservationModel.updateState(id, body.estado));
}

module.exports = { create, getAll, getById, getEmails, sendEmail, updateState };
