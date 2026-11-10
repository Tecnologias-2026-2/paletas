const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Base de datos y autenticación simuladas: la prueba no toca Firestore real.
const store = new Map();
const fakeCollection = name => ({
  doc: id => {
    const key = `${name}/${id || `auto${store.size}Abcdef1234567`}`;
    const docId = key.split('/')[1];
    return {
      id: docId,
      create: async data => { store.set(key, data); },
      get: async () => ({ exists: store.has(key), data: () => store.get(key) }),
      delete: async () => { store.delete(key); }
    };
  }
});
process.env.FIREBASE_ADMIN_UID = 'admin-uid';
const connectionPath = require.resolve('../database/connection');
require.cache[connectionPath] = {
  id: connectionPath,
  filename: connectionPath,
  loaded: true,
  exports: {
    db: { collection: fakeCollection },
    auth: {
      verifyIdToken: async token => {
        if (token === 'admin') return { uid: 'admin-uid' };
        if (token === 'other') return { uid: 'someone' };
        throw new Error('invalid');
      }
    }
  }
};

const productRoutes = require('../routes/product.routes');

const server = http.createServer(async (req, res) => {
  try {
    await productRoutes(req, res, new URL(req.url, 'http://x').pathname);
  } catch (error) {
    res.writeHead(error.status || 500).end(JSON.stringify({ error: error.message }));
  }
});

let base;
test.before(async () => {
  await new Promise(resolve => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const upload = (body, token) => fetch(`${base}/api/products/images`, {
  method: 'POST',
  headers: { 'Content-Type': 'image/png', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body
});

test('upload requires the administrator account', async () => {
  assert.equal((await upload(png)).status, 401);
  assert.equal((await upload(png, 'other')).status, 403);
});

test('rejects files that are not PNG, JPEG or WebP, and oversized files', async () => {
  assert.equal((await upload(Buffer.from('<svg></svg> padding padding'), 'admin')).status, 400);
  assert.equal((await upload(Buffer.alloc(800 * 1024, 1), 'admin')).status, 413);
});

test('stores an image, serves it publicly and deletes it', async () => {
  const created = await upload(png, 'admin');
  assert.equal(created.status, 201);
  const { imagen } = await created.json();
  assert.match(imagen, /^\/api\/products\/images\/[A-Za-z0-9]{10,40}$/);

  const served = await fetch(`${base}${imagen}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
  assert.match(served.headers.get('cache-control'), /immutable/);
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);

  assert.equal((await fetch(`${base}${imagen}`, { method: 'DELETE' })).status, 401);
  assert.equal((await fetch(`${base}${imagen}`, { method: 'DELETE', headers: { Authorization: 'Bearer admin' } })).status, 200);
  assert.equal((await fetch(`${base}${imagen}`)).status, 404);
});
