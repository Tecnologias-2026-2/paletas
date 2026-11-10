const { db } = require('../database/connection');
const {
  MAX_UPLOADED_IMAGE_BYTES,
  detectImageType,
  slugify,
  uploadedImageId,
  validateProduct
} = require('../domain');
const { requireAdmin } = require('../middleware/admin-auth');
const { readBody, readRaw, sendJson, serialize } = require('../utils/http');

const IMAGES = 'imagenesProductos';

// Borra la imagen subida asociada a un producto; las imágenes del sitio (assets/...) no se tocan.
async function deleteUploadedImage(imagen) {
  const imageId = uploadedImageId(imagen);
  if (imageId) await db.collection(IMAGES).doc(imageId).delete();
}

async function imageRoutes(req, res, segments) {
  const imageId = segments[3];
  if (segments.length > 4) return sendJson(res, 404, { error: 'Ruta de imágenes no encontrada.' });

  if (req.method === 'POST' && !imageId) {
    await requireAdmin(req);
    const data = await readRaw(req, MAX_UPLOADED_IMAGE_BYTES);
    const contentType = detectImageType(data);
    if (!contentType) {
      return sendJson(res, 400, { error: 'El archivo debe ser una imagen PNG, JPG o WebP.' });
    }
    const doc = db.collection(IMAGES).doc();
    await doc.create({ contentType, data, size: data.length, creada: new Date() });
    return sendJson(res, 201, { imagen: `/api/products/images/${doc.id}` });
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && imageId) {
    if (!uploadedImageId(`/api/products/images/${imageId}`)) {
      return sendJson(res, 404, { error: 'Imagen no encontrada.' });
    }
    const snapshot = await db.collection(IMAGES).doc(imageId).get();
    if (!snapshot.exists) return sendJson(res, 404, { error: 'Imagen no encontrada.' });
    const { contentType, data } = snapshot.data();
    const bytes = Buffer.from(data);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': bytes.length,
      // El ID cambia en cada subida, así que el contenido nunca se modifica.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'",
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });
    return res.end(req.method === 'HEAD' ? undefined : bytes);
  }

  if (req.method === 'DELETE' && imageId) {
    await requireAdmin(req);
    if (!uploadedImageId(`/api/products/images/${imageId}`)) {
      return sendJson(res, 404, { error: 'Imagen no encontrada.' });
    }
    await db.collection(IMAGES).doc(imageId).delete();
    return sendJson(res, 200, { deleted: true });
  }
  return sendJson(res, 404, { error: 'Ruta de imágenes no encontrada.' });
}

async function productRoutes(req, res, pathname) {
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const id = segments[2];

  if (id === 'images') return imageRoutes(req, res, segments);

  if (req.method === 'GET' && !id) {
    const snapshot = await db.collection('productos').orderBy('orden').get();
    return sendJson(res, 200, snapshot.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) })));
  }
  if (id === 'import' && req.method === 'POST') {
    await requireAdmin(req);
    const body = await readBody(req);
    if (!Array.isArray(body.productos) || !body.productos.length || body.productos.length > 200 ||
        !body.productos.every(product => {
          if (!product || typeof product.id !== 'string' ||
              product.id.length === 0 || product.id.length > 100) return false;
          const { id: legacyId, ...data } = product;
          return Boolean(legacyId) && validateProduct(data);
        }) ||
        new Set(body.productos.map(product => slugify(product.id))).size !== body.productos.length) {
      return sendJson(res, 400, { error: 'La lista de productos locales no es válida.' });
    }
    const existing = await db.collection('productos').limit(1).get();
    if (!existing.empty) {
      return sendJson(res, 409, { error: 'El catálogo Firestore ya tiene datos; no se importó ni sobrescribió nada.' });
    }
    const batch = db.batch();
    body.productos.forEach((product, index) => {
      const { id: legacyId, ...data } = product;
      batch.create(db.collection('productos').doc(slugify(legacyId)), { ...data, orden: index });
    });
    await batch.commit();
    return sendJson(res, 201, { imported: body.productos.length });
  }
  if (id === 'restore' && req.method === 'POST') {
    await requireAdmin(req);
    const seed = require('../database/catalog-seed');
    const current = await db.collection('productos').get();
    const batch = db.batch();
    const existingIds = new Set(current.docs.map(doc => doc.id));
    current.docs.forEach(doc => {
      const product = seed.find(item => item.id === doc.id);
      if (product) {
        const { id: productId, ...data } = product;
        batch.set(doc.ref, { ...data, orden: seed.findIndex(item => item.id === productId) });
      } else {
        batch.delete(doc.ref);
        const imageId = uploadedImageId(doc.data().imagen);
        if (imageId) batch.delete(db.collection(IMAGES).doc(imageId));
      }
    });
    seed.forEach(({ id: productId, ...product }, index) => {
      if (!existingIds.has(productId)) {
        batch.set(db.collection('productos').doc(productId), { ...product, orden: index });
      }
    });
    await batch.commit();
    return sendJson(res, 200, { restored: seed.length });
  }
  if (req.method === 'POST' && !id) {
    await requireAdmin(req);
    const body = await readBody(req);
    if (!validateProduct(body) || Object.hasOwn(body, 'orden')) {
      return sendJson(res, 400, { error: 'Los datos del producto no son válidos.' });
    }
    const randomDoc = db.collection('productos').doc();
    const orden = (await db.collection('productos').count().get()).data().count;
    const productId = `${slugify(body.nombre)}-${randomDoc.id.slice(0, 5)}`;
    const product = { ...body, orden };
    await db.collection('productos').doc(productId).create(product);
    return sendJson(res, 201, { id: productId, ...product });
  }
  if (id && req.method === 'PUT') {
    await requireAdmin(req);
    const body = await readBody(req);
    const product = db.collection('productos').doc(id);
    const current = await product.get();
    if (!current.exists) return sendJson(res, 404, { error: 'Producto no encontrado.' });
    const fields = ['nombre', 'precio', 'peso', 'imagen', 'alt', 'categorias'];
    if (Object.keys(body).some(key => !fields.includes(key))) {
      return sendJson(res, 400, { error: 'El producto contiene campos no permitidos.' });
    }
    const updated = { ...current.data(), ...body };
    if (!validateProduct(updated)) return sendJson(res, 400, { error: 'Los datos del producto no son válidos.' });
    await product.set(updated);
    if (updated.imagen !== current.data().imagen) await deleteUploadedImage(current.data().imagen);
    return sendJson(res, 200, { id, ...updated });
  }
  if (id && req.method === 'PATCH') {
    await requireAdmin(req);
    const body = await readBody(req);
    if (!Number.isInteger(body.delta) || ![-1, 1].includes(body.delta)) {
      return sendJson(res, 400, { error: 'El movimiento debe ser -1 o 1.' });
    }
    const snapshot = await db.collection('productos').orderBy('orden').get();
    const docs = snapshot.docs;
    const index = docs.findIndex(doc => doc.id === id);
    const nextIndex = index + body.delta;
    if (index < 0) return sendJson(res, 404, { error: 'Producto no encontrado.' });
    if (nextIndex < 0 || nextIndex >= docs.length) return sendJson(res, 200, { moved: false });
    const batch = db.batch();
    batch.update(docs[index].ref, { orden: docs[nextIndex].data().orden });
    batch.update(docs[nextIndex].ref, { orden: docs[index].data().orden });
    await batch.commit();
    return sendJson(res, 200, { moved: true });
  }
  if (id && req.method === 'DELETE') {
    await requireAdmin(req);
    const product = db.collection('productos').doc(id);
    const snapshot = await product.get();
    if (!snapshot.exists) return sendJson(res, 404, { error: 'Producto no encontrado.' });
    await product.delete();
    await deleteUploadedImage(snapshot.data().imagen);
    return sendJson(res, 200, { deleted: true });
  }
  return sendJson(res, 404, { error: 'Ruta de productos no encontrada.' });
}

module.exports = productRoutes;
