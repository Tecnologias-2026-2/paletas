const reservationController = require('../controllers/reservation.controller');
const { requireAdmin } = require('../middleware/admin-auth');
const { sendJson } = require('../utils/http');

async function reservationRoutes(req, res, pathname) {
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const id = segments[2];
  const emails = segments[3] === 'emails';

  if (req.method === 'POST' && !id) return reservationController.create(req, res);
  if (req.method === 'GET' && !id) {
    await requireAdmin(req);
    return reservationController.getAll(req, res);
  }
  if (id && emails && req.method === 'GET' && segments.length === 4) {
    await requireAdmin(req);
    return reservationController.getEmails(req, res, id);
  }
  if (id && emails && req.method === 'POST' && segments.length === 4) {
    await requireAdmin(req);
    return reservationController.sendEmail(req, res, id);
  }
  if (id && !emails && segments.length === 3 && req.method === 'GET') {
    await requireAdmin(req);
    return reservationController.getById(req, res, id);
  }
  if (id && !emails && segments.length === 3 && req.method === 'PATCH') {
    await requireAdmin(req);
    return reservationController.updateState(req, res, id);
  }
  return sendJson(res, 404, { error: 'Ruta de reservas no encontrada.' });
}

module.exports = reservationRoutes;
