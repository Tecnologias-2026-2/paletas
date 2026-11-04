const orderController = require('../controllers/order.controller');
const { requireAdmin } = require('../middleware/admin-auth');
const { sendJson } = require('../utils/http');

async function orderRoutes(req, res, pathname) {
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const id = segments[2];

  if (req.method === 'POST' && !id) return orderController.create(req, res);
  if (req.method === 'GET' && !id) {
    await requireAdmin(req);
    return orderController.getAll(req, res);
  }
  if (id === 'import' && req.method === 'POST') {
    await requireAdmin(req);
    return orderController.importLegacy(req, res);
  }
  if (id && req.method === 'GET') {
    await requireAdmin(req);
    return orderController.getById(req, res, id);
  }
  if (id && req.method === 'PATCH') {
    await requireAdmin(req);
    return orderController.updateState(req, res, id);
  }
  return sendJson(res, 404, { error: 'Ruta de pedidos no encontrada.' });
}

module.exports = orderRoutes;
