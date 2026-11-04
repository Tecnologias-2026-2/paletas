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

const isText = (value, maxLength, minLength = 1) =>
  typeof value === 'string' && value.trim().length >= minLength && value.trim().length <= maxLength;

function validateProduct(product) {
  return product && Object.keys(product).every(key => PRODUCT_FIELDS.has(key) || key === 'orden') &&
    isText(product.nombre, 100) &&
    Number.isInteger(product.precio) && product.precio > 0 && product.precio <= 999999 &&
    isText(product.peso, 30) &&
    isText(product.imagen, 300) &&
    isText(product.alt, 200) &&
    Array.isArray(product.categorias) &&
    product.categorias.every(category => CATEGORIES.has(category));
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
  ORDER_STATES,
  PACKAGING,
  RESERVATION_STATES,
  slugify,
  validateLegacyOrder,
  validateOrder,
  validateProduct,
  validateReservation
};
