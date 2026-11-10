const CATEGORIES = new Set(['frutales', 'temporada', 'cremosas', 'exclusivas']);
const ORDER_STATES = new Set([
  'pendiente de aprobación',
  'confirmado',
  'proceso',
  'enviado',
  'finalizado'
]);
const RESERVATION_STATES = new Set(['pendiente', 'confirmada', 'finalizada', 'cancelada']);
const PRODUCT_FIELDS = new Set(['nombre', 'precio', 'peso', 'imagen', 'alt', 'categorias']);
const PACKAGING = {
  'caja-madera': { nombre: 'Caja Madera', costo: 10500 },
  'caja-carton': { nombre: 'Caja Cartón', costo: 5500 },
  'bolsa-plastica': { nombre: 'Bolsa Plástica', costo: 1500 }
};

const MAX_UPLOADED_IMAGE_BYTES = 700 * 1024;
const BUNDLED_IMAGE = /^assets\/imagenes\/paletas\/[a-z0-9-]+\.(png|webp|jpe?g)$/;
const UPLOADED_IMAGE = /^\/api\/products\/images\/([A-Za-z0-9]{10,40})$/;

const isText = (value, maxLength, minLength = 1) =>
  typeof value === 'string' && value.trim().length >= minLength && value.trim().length <= maxLength;

function validateProduct(product) {
  return product && Object.keys(product).every(key => PRODUCT_FIELDS.has(key) || key === 'orden') &&
    isText(product.nombre, 100) &&
    Number.isInteger(product.precio) && product.precio > 0 && product.precio <= 999999 &&
    isText(product.peso, 30) &&
    isText(product.imagen, 300) &&
    (BUNDLED_IMAGE.test(product.imagen) || UPLOADED_IMAGE.test(product.imagen)) &&
    isText(product.alt, 200) &&
    Array.isArray(product.categorias) &&
    product.categorias.every(category => CATEGORIES.has(category));
}

// Detecta el formato real por los primeros bytes, sin confiar en el Content-Type enviado.
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

function uploadedImageId(imagen) {
  const match = typeof imagen === 'string' ? UPLOADED_IMAGE.exec(imagen) : null;
  return match ? match[1] : null;
}

function validateReservation(data) {
  if (!data || !isText(data.tipoEvento, 80) ||
      !Number.isInteger(data.numeroInvitados) || data.numeroInvitados < 1 || data.numeroInvitados > 10000 ||
      !isText(data.fechaEvento, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(data.fechaEvento) ||
      !isText(data.ubicacionEvento, 120) ||
      typeof data.requerimientos !== 'string' || data.requerimientos.length > 600 ||
      !isText(data.nombreContacto, 80) ||
      !isText(data.direccionResidencia, 120) ||
      !/^\d{6}$/.test(data.codigoPostal) ||
      !isText(data.correoContacto, 120) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correoContacto)) {
    return false;
  }
  const date = new Date(`${data.fechaEvento}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(date.getTime()) &&
  date.toISOString().slice(0, 10) === data.fechaEvento &&
  date >= today;
}

function validateOrder(data) {
  return data &&
    data.cliente &&
    isText(data.cliente.nombre, 120, 3) &&
    isText(data.cliente.direccion, 200, 5) &&
    isText(data.cliente.correo, 120) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.cliente.correo) &&
    isText(data.cliente.telefono, 30) &&
    /^[\d\s+()-]{7,20}$/.test(data.cliente.telefono) &&
    isText(data.cliente.municipio, 100) &&
    ['tarjeta', 'cuenta', 'pse', 'qr'].includes(data.metodoPago) &&
    Array.isArray(data.items) && data.items.length > 0 && data.items.length <= 50 &&
    data.items.every(item =>
      item && isText(item.id, 100) && !item.id.includes('/') &&
      item.id !== '.' && item.id !== '..' && Number.isInteger(item.cantidad) &&
      item.cantidad >= 1 && item.cantidad <= 99) &&
    Boolean(PACKAGING[data.empaque]);
}

function validateLegacyOrder(order) {
  return order &&
    isText(order.id, 80) &&
    (!order.fecha || (typeof order.fecha === 'string' && Number.isFinite(Date.parse(order.fecha)))) &&
    order.cliente &&
    isText(order.cliente.nombre, 120, 3) &&
    isText(order.cliente.direccion, 200, 5) &&
    isText(order.cliente.correo, 120) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.cliente.correo) &&
    isText(order.cliente.telefono, 30) &&
    isText(order.cliente.municipio, 100) &&
    ['tarjeta', 'cuenta', 'pse', 'qr'].includes(order.metodoPago) &&
    Array.isArray(order.items) && order.items.length > 0 && order.items.length <= 50 &&
    order.items.every(item =>
      item && isText(item.nombre, 100) && Number.isInteger(item.precio) &&
      item.precio > 0 && Number.isInteger(item.cantidad) && item.cantidad > 0 && item.cantidad <= 99) &&
    order.empaque && isText(order.empaque.nombre, 80) &&
    Number.isInteger(order.empaque.costo) && order.empaque.costo >= 0 &&
    Number.isInteger(order.subtotal) && order.subtotal >= 0 &&
    Number.isInteger(order.envio) && order.envio >= 0 &&
    Number.isInteger(order.total) && order.total === order.subtotal + order.envio &&
    ORDER_STATES.has(order.estado);
}

function slugify(value) {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'paleta';
}

module.exports = {
  MAX_UPLOADED_IMAGE_BYTES,
  detectImageType,
  ORDER_STATES,
  PACKAGING,
  RESERVATION_STATES,
  slugify,
  uploadedImageId,
  validateLegacyOrder,
  validateOrder,
  validateProduct,
  validateReservation
};
