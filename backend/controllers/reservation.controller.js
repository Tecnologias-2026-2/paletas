const { notifySafely } = require('../services/notification.service');
const reservationModel = require('../models/reservation.model');
const { RESERVATION_STATES, validateReservation } = require('../domain');
const { readBody, sendJson } = require('../utils/http');
const { sendReservationEmail, validateEmailContent } = require('../services/email.service');

async function create(req, res) {
  const body = await readBody(req);
  if (!validateReservation(body)) {
    return sendJson(res, 400, { error: 'Los datos de la solicitud no son válidos.' });
  }
  const reservation = await reservationModel.create(body);
  await notifySafely('eventos', reservation.id, {asunto:'Nueva solicitud de evento', titulo:'Recibiste una solicitud de evento', mensaje:'Cliente: ' + body.nombreContacto + '\nEvento: ' + body.tipoEvento + '\nFecha: ' + body.fechaEvento + '\nInvitados: ' + body.numeroInvitados});
  return sendJson(res, 201, reservation);
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
    if (error.status) throw error;
    throw Object.assign(
      new Error('El servicio de correo no pudo enviar el mensaje. Revisa la configuración del servidor.'),
      { status: 502 }
    );
  }

  await reservationModel.updateEmail(id, emailId, {
    estado: 'enviado',
    messageId: result.messageId
  });
  await notifySafely('correos', id, {asunto:'Correo enviado a un cliente', titulo:'Correo de reserva enviado', mensaje:'Destinatario: ' + reservation.correoContacto + '\nAsunto: ' + body.asunto});
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
