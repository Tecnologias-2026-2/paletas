const { notifySafely } = require('../services/notification.service');
const orderModel = require('../models/order.model');
const { ORDER_STATES, validateLegacyOrder, validateOrder } = require('../domain');
const { readBody, sendJson } = require('../utils/http');
const { sendCustomerEmail, validateEmailContent } = require('../services/email.service');

async function getAll(req, res) {
  return sendJson(res, 200, await orderModel.getAll());
}

async function getById(req, res, id) {
  return sendJson(res, 200, await orderModel.getById(id));
}

async function create(req, res) {
  const body = await readBody(req);
  if (!validateOrder(body)) return sendJson(res, 400, { error: 'Los datos del pedido no son válidos.' });
  const order = await orderModel.create(body);
  await notifySafely('compras', order.id, {asunto:'Nuevo pedido en Paletas de Hielo', titulo:'Recibiste un pedido', mensaje: 'Cliente: ' + body.cliente.nombre + '\nReferencia: ' + order.numero});
  return sendJson(res, 201, order);
}

async function updateState(req, res, id) {
  const body = await readBody(req);
  if (!ORDER_STATES.has(body.estado) || Object.keys(body).some(key => key !== 'estado')) {
    return sendJson(res, 400, { error: 'El estado del pedido no es válido.' });
  }
  return sendJson(res, 200, await orderModel.updateState(id, body.estado));
}

async function getEmails(req, res, id) {
  return sendJson(res, 200, await orderModel.getEmails(id));
}

async function sendEmail(req, res, id) {
  const body = await readBody(req);
  if (!validateEmailContent(body)) {
    return sendJson(res, 400, { error: 'El asunto, título o mensaje no son válidos.' });
  }

  const order = await orderModel.getById(id);
  const emailId = await orderModel.createEmail(id, {
    destinatario: order.cliente.correo,
    asunto: body.asunto.trim(),
    titulo: body.titulo.trim(),
    mensaje: body.mensaje.trim()
  });

  let result;
  try {
    result = await sendCustomerEmail({
      email: order.cliente.correo,
      name: order.cliente.nombre
    }, order.numero, body, 'Referencia del pedido');
  } catch (error) {
    await orderModel.updateEmail(id, emailId, { estado: 'fallido' });
    if (error.status) throw error;
    throw Object.assign(
      new Error('El servicio de correo no pudo enviar el mensaje. Revisa la configuración del servidor.'),
      { status: 502 }
    );
  }

  await orderModel.updateEmail(id, emailId, {
    estado: 'enviado',
    messageId: result.messageId
  });
  await notifySafely('correos', id, {asunto:'Correo enviado a un cliente', titulo:'Correo de pedido enviado', mensaje:'Destinatario: ' + order.cliente.correo + '\nAsunto: ' + body.asunto});
  return sendJson(res, 201, { id: emailId, estado: 'enviado' });
}

async function importLegacy(req, res) {
  const body = await readBody(req);
  if (!Array.isArray(body.pedidos) || body.pedidos.length > 500 ||
      !body.pedidos.every(order => validateLegacyOrder(order))) {
    return sendJson(res, 400, { error: 'La lista de pedidos locales no es válida.' });
  }
  return sendJson(res, 200, await orderModel.importLegacy(body.pedidos));
}

module.exports = { getAll, getById, create, getEmails, sendEmail, updateState, importLegacy };
