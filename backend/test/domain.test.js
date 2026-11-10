const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectImageType,
  slugify,
  uploadedImageId,
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

test('accepts bundled and uploaded product images only', () => {
  const product = {
    nombre: 'Paleta Nueva',
    precio: 7000,
    peso: '90gr',
    imagen: '/api/products/images/AbCdEf1234567890xyZ1',
    alt: 'Paleta nueva',
    categorias: []
  };
  assert.equal(validateProduct(product), true);
  assert.equal(validateProduct({ ...product, imagen: 'https://example.com/a.png' }), false);
  assert.equal(validateProduct({ ...product, imagen: '/api/products/images/../x' }), false);
  assert.equal(uploadedImageId(product.imagen), 'AbCdEf1234567890xyZ1');
  assert.equal(uploadedImageId('assets/imagenes/paletas/limon.png'), null);
});

test('detects image type from file signature', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(12)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(4)]);
  assert.equal(detectImageType(png), 'image/png');
  assert.equal(detectImageType(jpeg), 'image/jpeg');
  assert.equal(detectImageType(webp), 'image/webp');
  assert.equal(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(detectImageType(Buffer.alloc(4)), null);
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
