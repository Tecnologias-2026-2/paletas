const test = require('node:test');
const assert = require('node:assert/strict');
const {
  slugify,
  validateLegacyOrder,
  validateOrder,
  validateProduct,
  validateReservation
} = require('../domain');

test('validates catalog products and safe IDs', () => {
  const product = {
    nombre: 'Paleta de Limón',
    precio: 6000,
    peso: '90gr',
    imagen: 'assets/imagenes/paletas/limon.png',
    alt: 'Paleta verde',
    categorias: ['frutales']
  };
  assert.equal(validateProduct(product), true);
  assert.equal(validateProduct({ ...product, precio: -1 }), false);
  assert.equal(validateProduct({ ...product, categorias: ['otra'] }), false);
  assert.equal(slugify(product.nombre), 'paleta-de-limon');
});

test('validates a future reservation from the public form', () => {
  const reservation = {
    tipoEvento: 'Cumpleaños',
    numeroInvitados: 20,
    fechaEvento: '2099-01-15',
    ubicacionEvento: 'Bogotá',
    requerimientos: '',
    nombreContacto: 'Ana García',
    direccionResidencia: 'Calle 1',
    codigoPostal: '123456',
    correoContacto: 'ana@example.com'
  };
  assert.equal(validateReservation(reservation), true);
  assert.equal(validateReservation({ ...reservation, numeroInvitados: 0 }), false);
  assert.equal(validateReservation({ ...reservation, fechaEvento: '2099-02-31' }), false);
});

test('validates orders and rejects client-controlled totals or packaging', () => {
  const order = {
    cliente: {
      nombre: 'Ana García',
      direccion: 'Calle 123',
      correo: 'ana@example.com',
      telefono: '+57 3001234567',
      municipio: 'Bogotá'
    },
    metodoPago: 'tarjeta',
    items: [{ id: 'limon', cantidad: 2 }],
    empaque: 'caja-carton'
  };
  assert.equal(validateOrder(order), true);
  assert.equal(validateOrder({ ...order, empaque: { costo: 0 } }), false);
  assert.equal(validateOrder({ ...order, items: [{ id: 'limon', cantidad: 0 }] }), false);
});

test('validates historical orders migrated from browser storage', () => {
  const order = {
    id: 'PED-0001',
    cliente: {
      nombre: 'Ana García',
      direccion: 'Calle 123',
      correo: 'ana@example.com',
      telefono: '3001234567',
      municipio: 'Bogotá'
    },
    metodoPago: 'tarjeta',
    items: [{ nombre: 'Paleta de Limón', precio: 6000, cantidad: 2 }],
    empaque: { nombre: 'Caja Cartón', costo: 5500 },
    subtotal: 17500,
    envio: 0,
    total: 17500,
    estado: 'pendiente de aprobación',
    fecha: '2026-10-24T20:00:00.000Z'
  };
  assert.equal(validateLegacyOrder(order), true);
  assert.equal(validateLegacyOrder({ ...order, total: 1 }), false);
});
