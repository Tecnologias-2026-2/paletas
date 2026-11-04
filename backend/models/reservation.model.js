const { db, FieldValue } = require('../database/connection');
const { documentNotFound, serialize } = require('../utils/http');

const reservations = db.collection('reservas');

async function create(data) {
  const reservation = {
    tipoEvento: data.tipoEvento.trim(),
    numeroInvitados: data.numeroInvitados,
    fechaEvento: data.fechaEvento,
    ubicacionEvento: data.ubicacionEvento.trim(),
    requerimientos: data.requerimientos.trim(),
    nombreContacto: data.nombreContacto.trim(),
    direccionResidencia: data.direccionResidencia.trim(),
    codigoPostal: data.codigoPostal,
    correoContacto: data.correoContacto.trim().toLowerCase(),
    estado: 'pendiente',
    prioridad: 'media',
    fechaSolicitud: FieldValue.serverTimestamp()
  };
  const ref = await reservations.add(reservation);
  return { id: ref.id };
}

async function getAll() {
  const snapshot = await reservations.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) }));
}

async function getById(id) {
  const snapshot = await reservations.doc(id).get();
  if (!snapshot.exists) throw documentNotFound('Reserva no encontrada.');
  return { id, ...serialize(snapshot.data()) };
}

async function updateState(id, estado) {
  const ref = reservations.doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw documentNotFound('Reserva no encontrada.');
  await ref.update({
    estado,
    fechaActualizacion: FieldValue.serverTimestamp(),
    actualizadoPor: process.env.FIREBASE_ADMIN_UID
  });
  return { id, estado };
}

async function getEmails(id) {
  const snapshot = await reservations.doc(id).collection('correos')
    .orderBy('fechaEnvio', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) }));
}

async function createEmail(id, data) {
  const ref = await reservations.doc(id).collection('correos').add({
    ...data,
    estado: 'enviando',
    fechaEnvio: FieldValue.serverTimestamp()
  });
  return ref.id;
}

async function updateEmail(id, emailId, data) {
  await reservations.doc(id).collection('correos').doc(emailId).update({
    ...data,
    ...(data.estado === 'enviado' ? { fechaEnvio: FieldValue.serverTimestamp() } : {})
  });
}

module.exports = { create, createEmail, getAll, getById, getEmails, updateEmail, updateState };
