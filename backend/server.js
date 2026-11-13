require('dotenv').config();

const fs = require('fs');
const http = require('http');
const path = require('path');
const { db } = require('./database/connection');
const notificationRoutes = require('./routes/notification.routes');
const contactRoutes = require('./routes/contact.routes');
const stateTemplateRoutes = require('./routes/state-template.routes');
const adminRoutes = require('./routes/admin.routes');
const orderRoutes = require('./routes/order.routes');
const productRoutes = require('./routes/product.routes');
const reservationRoutes = require('./routes/reservation.routes');
const { sendJson } = require('./utils/http');

const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_ROOT = path.resolve(__dirname, '..', 'frontend');
const ALLOWED_ORIGINS = new Set([
  'https://tecnologias-2026-2.github.io',
  ...(process.env.CORS_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
]);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function checkFirestoreConnection() {
  try {
    await db.listCollections();
    console.log('Base de datos Firestore conectada.');
  } catch (error) {
    console.error('No se pudo conectar a la base de datos Firestore:', error.message);
  }
}

function firestoreError(error) {
  if (error.status) return error;
  if (error.code === 5 || error.code === 'not-found') {
    return Object.assign(new Error('El registro solicitado no existe.'), { status: 404 });
  }
  console.error('Error de Firestore:', error.code || error.message);
  return Object.assign(new Error('No se pudo completar la operación en Firestore.'), { status: 500 });
}

async function serveStatic(req, res, pathname) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname);
  } catch {
    return sendJson(res, 400, { error: 'Ruta inválida.' });
  }
  if (relativePath === '/') relativePath = '/index.html';
  if (relativePath.startsWith('/frontend/')) relativePath = relativePath.slice('/frontend'.length);

  const filePath = path.resolve(FRONTEND_ROOT, `.${relativePath}`);
  if (!filePath.startsWith(`${FRONTEND_ROOT}${path.sep}`)) {
    return sendJson(res, 403, { error: 'Ruta no permitida.' });
  }
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) return sendJson(res, 404, { error: 'Archivo no encontrado.' });
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    sendJson(res, 404, { error: 'Archivo no encontrado.' });
  }
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', service: 'paletas-backend' });
  }
  if (pathname.startsWith('/api/admin/state-template/')) return stateTemplateRoutes(req,res,pathname);
  if (pathname === '/api/contact') return contactRoutes(req, res);
  if (pathname === '/api/admin/notifications' || pathname === '/api/admin/notifications/test') return notificationRoutes(req, res, pathname);
  if (pathname === '/api/admin') return adminRoutes(req, res, pathname);
  if (pathname === '/api/products' || pathname.startsWith('/api/products/')) {
    return productRoutes(req, res, pathname);
  }
  if (pathname === '/api/orders' || pathname.startsWith('/api/orders/')) {
    return orderRoutes(req, res, pathname);
  }
  if (pathname === '/api/reservas' || pathname.startsWith('/api/reservas/')) {
    return reservationRoutes(req, res, pathname);
  }
  if (pathname === '/api/reservation' || pathname.startsWith('/api/reservation/')) {
    return reservationRoutes(req, res, pathname);
  }
  if (pathname === '/api/reservations' || pathname.startsWith('/api/reservations/')) {
    return reservationRoutes(req, res, pathname);
  }
  return sendJson(res, 404, { error: 'Ruta de API no encontrada.' });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJson(res, 405, { error: 'Método no permitido.' });
    }
    return await serveStatic(req, res, pathname);
  } catch (error) {
    const failure = firestoreError(error);
    if (!res.headersSent) sendJson(res, failure.status || 500, { error: failure.message });
    else res.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend de Paletas ejecutándose en http://localhost:${PORT}`);
  checkFirestoreConnection();
});

module.exports = server;
