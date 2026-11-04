const userController = require('../controllers/user.controller');
const { requireAdmin } = require('../middleware/admin-auth');
const { sendJson } = require('../utils/http');

async function adminRoutes(req, res, pathname) {
  if (req.method !== 'GET' || pathname !== '/api/admin') {
    return sendJson(res, 404, { error: 'Ruta de administrador no encontrada.' });
  }
  await requireAdmin(req);
  return userController.getAdmin(req, res);
}

module.exports = adminRoutes;
