const { createHash } = require('crypto');
const { db, FieldValue } = require('../database/connection');
const { PACKAGING, slugify } = require('../domain');
const { documentNotFound, serialize } = require('../utils/http');

const orders = db.collection('pedidos');

async function getAll() {
  const snapshot = await orders.orderBy('fecha', 'desc').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    numero: doc.data().idOriginal || `PED-${doc.id.slice(0, 8).toUpperCase()}`,
    ...serialize(doc.data())
  }));
}

async function getById(id) {
  const snapshot = await orders.doc(id).get();
  if (!snapshot.exists) throw documentNotFound('Pedido no encontrado.');
  return {
    id,
    numero: snapshot.data().idOriginal || `PED-${id.slice(0, 8).toUpperCase()}`,
    ...serialize(snapshot.data())
  };
}

async function create(data) {
  const items = [];
  for (const requested of data.items) {
    const snapshot = await db.collection('productos').doc(requested.id).get();
    if (!snapshot.exists) {
      throw Object.assign(new Error(`El producto ${requested.id} ya no está disponible.`), { status: 400 });
    }
    items.push({ id: requested.id, ...snapshot.data(), cantidad: requested.cantidad });
  }
  const empaque = PACKAGING[data.empaque];
  const productosTotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const subtotal = productosTotal + empaque.costo;
  const envio = subtotal >= 11500 ? 0 : 5000;
  const ref = orders.doc();
  await ref.set({
    cliente: {
      nombre: data.cliente.nombre.trim(),
      direccion: data.cliente.direccion.trim(),
      correo: data.cliente.correo.trim().toLowerCase(),
      telefono: data.cliente.telefono.trim(),
      municipio: data.cliente.municipio.trim()
    },
    metodoPago: data.metodoPago,
    items: items.map(({ id, nombre, peso, precio, cantidad }) => ({ id, nombre, peso, precio, cantidad })),
    empaque,
    subtotal,
    envio,
    total: subtotal + envio,
    estado: 'pendiente de aprobación',
    fecha: FieldValue.serverTimestamp()
  });
  return { id: ref.id, numero: `PED-${ref.id.slice(0, 8).toUpperCase()}` };
}

async function updateState(id, estado) {
  return require('../services/state-mail.service').advance('pedido', id, estado);
}

async function getEmails(id) {
  const snapshot = await orders.doc(id).collection('correos')
    .orderBy('fechaEnvio', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) }));
}

async function createEmail(id, data) {
  const ref = await orders.doc(id).collection('correos').add({
    ...data,
    estado: 'enviando',
    fechaEnvio: FieldValue.serverTimestamp()
  });
  return ref.id;
}

async function updateEmail(id, emailId, data) {
  await orders.doc(id).collection('correos').doc(emailId).update({
    ...data,
    ...(data.estado === 'enviado' ? { fechaEnvio: FieldValue.serverTimestamp() } : {})
  });
}

async function importLegacy(legacyOrders) {
  const ordersById = new Map();
  legacyOrders.forEach(order => {
    const digest = createHash('sha256').update(JSON.stringify(order)).digest('hex').slice(0, 12);
    ordersById.set(`legacy-${slugify(order.id)}-${digest}`, order);
  });
  const entries = [...ordersById.entries()];
  const refs = entries.map(([documentId]) => orders.doc(documentId));
  const existing = refs.length ? await db.getAll(...refs) : [];
  const batch = db.batch();
  let imported = 0;
  for (let index = 0; index < entries.length; index += 1) {
    if (existing[index].exists) continue;
    const [documentId, order] = entries[index];
    const { id: originalId, ...data } = order;
    batch.create(orders.doc(documentId), {
      ...data,
      idOriginal: originalId,
      migrado: true,
      fecha: data.fecha ? new Date(data.fecha) : FieldValue.serverTimestamp()
    });
    imported += 1;
  }
  if (imported) await batch.commit();
  return { imported, skipped: legacyOrders.length - imported };
}

module.exports = {
  getAll,
  getById,
  create,
  createEmail,
  getEmails,
  importLegacy,
  updateEmail,
  updateState
};
