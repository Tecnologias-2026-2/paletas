const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!projectId) {
  throw new Error('FIREBASE_PROJECT_ID debe estar configurado en backend/.env.');
}

const app = getApps()[0] || initializeApp({
  projectId,
  ...(usingEmulator ? {} : { credential: applicationDefault() })
});

module.exports = {
  auth: getAuth(app),
  db: getFirestore(app),
  FieldValue
};
