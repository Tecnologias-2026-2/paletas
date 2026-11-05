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
  return sendJson(res, 201, await orderModel.create(body));
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
    if (error.status === 503) throw error;
    throw Object.assign(
      new Error('Gmail no pudo enviar el correo. Verifica la configuración de la cuenta y SMTP.'),
      { status: 502 }
    );
  }

  await orderModel.updateEmail(id, emailId, {
    estado: 'enviado',
    messageId: result.messageId
  });
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
