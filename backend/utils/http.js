function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let oversized = false;
    req.on('data', chunk => {
      if (oversized) return;
      body += chunk;
      if (body.length > 1024 * 1024) {
        oversized = true;
        reject(Object.assign(new Error('El cuerpo excede el límite de 1 MB.'), { status: 413 }));
      }
    });
    req.on('end', () => {
      if (oversized) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error('El cuerpo debe contener JSON válido.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// Lee el cuerpo completo como Buffer (para subir archivos) respetando un límite en bytes.
function readRaw(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let failed = false;
    req.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > maxBytes) {
        failed = true;
        reject(Object.assign(new Error(`El archivo excede el límite de ${Math.round(maxBytes / 1024)} KB.`), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => { if (!failed) resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

function serialize(data) {
  if (data && typeof data.toDate === 'function') return data.toDate().toISOString();
  if (Array.isArray(data)) return data.map(serialize);
  if (data && typeof data === 'object') {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, serialize(value)]));
  }
  return data;
}

function documentNotFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

module.exports = { documentNotFound, readBody, readRaw, sendJson, serialize };
