const { requireAdmin } = require('../middleware/admin-auth');
const { readBody, sendJson } = require('../utils/http');
const service = require('../services/notification.service');
module.exports = async function notificationRoutes(req, res, pathname) {
  await requireAdmin(req);
  if (pathname === '/api/admin/notifications/test' && req.method === 'POST') {
    return sendJson(res, 200, await service.notifyAdmin('correos', 'Prueba de notificaciones', {
      asunto:'Prueba de notificaciones de Paletas de Hielo', titulo:'Tus notificaciones están conectadas',
      mensaje:'Este correo confirma que Paletas de Hielo puede enviar alertas a tu cuenta administradora.'
    }, {test:true}));
  }
  if (pathname !== '/api/admin/notifications') return sendJson(res, 404, {error:'Ruta no encontrada.'});
  if (req.method === 'PUT') await service.savePreferences(await readBody(req));
  else if (req.method !== 'GET') return sendJson(res, 405, {error:'Método no permitido.'});
  return sendJson(res, 200, {preferencias:await service.getPreferences(), correo:(await service.getRecipient()).email});
};
