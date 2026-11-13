const { db, FieldValue } = require('../database/connection');
const { readBody, sendJson } = require('../utils/http');
const { notifySafely } = require('../services/notification.service');
module.exports = async function contactRoutes(req, res) {
  if (req.method !== 'POST') return sendJson(res,405,{error:'Método no permitido.'});
  const data = await readBody(req);
  if (!data || Object.keys(data).some(k=>!['nombre','correo','mensaje'].includes(k)) ||
      typeof data.nombre !== 'string' || data.nombre.trim().length < 3 || data.nombre.length > 80 ||
      typeof data.correo !== 'string' || data.correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo) ||
      typeof data.mensaje !== 'string' || !data.mensaje.trim() || data.mensaje.length > 2000) {
    return sendJson(res,400,{error:'Revisa el nombre, correo y mensaje.'});
  }
  const ref = await db.collection('contactos').add({nombre:data.nombre.trim(),correo:data.correo.trim(),mensaje:data.mensaje.trim(),fecha:FieldValue.serverTimestamp()});
  await notifySafely('contacto',ref.id,{asunto:'Nuevo mensaje de contacto',titulo:'Un cliente solicitó información',
    mensaje:`Nombre: ${data.nombre.trim()}\nCorreo: ${data.correo.trim()}\n\n${data.mensaje.trim()}`});
  return sendJson(res,201,{id:ref.id});
};
