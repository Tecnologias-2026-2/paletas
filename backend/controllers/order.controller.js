const orderModel = require('../models/order.model');
const { ORDER_STATES, validateLegacyOrder, validateOrder } = require('../domain');
const { readBody, sendJson } = require('../utils/http');

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

async function importLegacy(req, res) {
  const body = await readBody(req);
  if (!Array.isArray(body.pedidos) || body.pedidos.length > 500 ||
      !body.pedidos.every(order => validateLegacyOrder(order))) {
    return sendJson(res, 400, { error: 'La lista de pedidos locales no es válida.' });
  }
  return sendJson(res, 200, await orderModel.importLegacy(body.pedidos));
}

module.exports = { getAll, getById, create, updateState, importLegacy };
