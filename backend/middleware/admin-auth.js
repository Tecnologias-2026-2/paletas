const { auth } = require('../database/connection');

async function requireAdmin(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) {
    throw Object.assign(new Error('Debes iniciar sesión con la cuenta administradora.'), { status: 401 });
  }

  const uid = process.env.FIREBASE_ADMIN_UID;
  if (!uid) {
    throw Object.assign(new Error('Configura FIREBASE_ADMIN_UID en backend/.env.'), { status: 503 });
  }

  let user;
  try {
    user = await auth.verifyIdToken(match[1]);
  } catch {
    throw Object.assign(new Error('La sesión no es válida o expiró.'), { status: 401 });
  }
  if (user.uid !== uid) {
    throw Object.assign(new Error('No tienes permisos de administrador.'), { status: 403 });
  }
  return user;
}

module.exports = { requireAdmin };
