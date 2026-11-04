const { auth } = require('../database/connection');

async function getAdmin() {
  const uid = process.env.FIREBASE_ADMIN_UID;
  if (!uid) {
    throw Object.assign(new Error('Configura FIREBASE_ADMIN_UID en backend/.env.'), { status: 503 });
  }
  const user = await auth.getUser(uid);
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    createdAt: user.metadata.creationTime,
    lastSignInAt: user.metadata.lastSignInTime
  };
}

module.exports = { getAdmin };
