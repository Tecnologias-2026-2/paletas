const { db, auth, FieldValue } = require('../database/connection');
const { sendCustomerEmail } = require('./email.service');
const CATEGORIES = ['compras', 'contacto', 'correos', 'eventos'];
const defaults = Object.fromEntries(CATEGORIES.map(key => [key, true]));
function adminUid() {
  if (!process.env.FIREBASE_ADMIN_UID) throw Object.assign(new Error('Falta configurar el administrador.'), {status:503});
  return process.env.FIREBASE_ADMIN_UID;
}
const settings = () => db.collection('preferenciasAdmin').doc(adminUid());
function validPreferences(value) {
  return value && Object.keys(value).length === CATEGORIES.length &&
    CATEGORIES.every(key => typeof value[key] === 'boolean');
}
async function getPreferences() {
  const snapshot = await settings().get();
  return Object.fromEntries(CATEGORIES.map(key => [key, snapshot.data()?.[key] ?? defaults[key]]));
}
async function getRecipient() {
  const user = await auth.getUser(adminUid());
  if (!user.email) throw Object.assign(new Error('La cuenta administradora no tiene correo configurado.'), {status:503});
  return {email:user.email, name:user.displayName || 'Juliana'};
}
async function savePreferences(value) {
  if (!validPreferences(value)) throw Object.assign(new Error('Las preferencias deben contener las cuatro opciones con valores booleanos.'), {status:400});
  await settings().set({...value, fechaActualizacion:FieldValue.serverTimestamp()});
}
async function notifyAdmin(category, reference, content, {test = false} = {}) {
  if (!CATEGORIES.includes(category)) throw new Error('Categoría inválida.');
  if (!test && !(await getPreferences())[category]) return {estado:'desactivada'};
  const recipient = await getRecipient();
  const record = db.collection('notificacionesAdmin').doc();
  await record.set({categoria:category, referencia:reference, destinatario:recipient.email,
    asunto:content.asunto, estado:'enviando', fecha:FieldValue.serverTimestamp()});
  try {
    const result = await sendCustomerEmail(recipient, reference, content);
    await record.update({estado:'enviado', messageId:result.messageId});
    return {estado:'enviado', correo:recipient.email};
  } catch {
    await record.update({estado:'fallido'});
    throw Object.assign(new Error('No se pudo enviar la alerta. Revisa la configuración del proveedor de correo en el servidor.'), {status:502});
  }
}
// Un fallo de correo no revierte un pedido o solicitud que ya quedó guardado.
async function notifySafely(category, reference, content) {
  try { return await notifyAdmin(category, reference, content); }
  catch (error) { console.error('No se pudo enviar una notificación de administrador:', category, error.status || 'error'); }
}
module.exports = { CATEGORIES, validPreferences, getPreferences, getRecipient, savePreferences, notifyAdmin, notifySafely };
