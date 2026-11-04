require('dotenv').config();

const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const products = require('./catalog-seed');

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID debe estar configurado en backend/.env.');

const app = getApps()[0] || initializeApp({
  projectId,
  ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() })
});
const db = getFirestore(app);

async function seedProducts() {
  const batch = db.batch();
  products.forEach(({ id, ...product }, index) => {
    batch.create(db.collection('productos').doc(id), { ...product, orden: index });
  });
  try {
    await batch.commit();
    console.log(`Se importaron ${products.length} productos sin sobrescribir documentos existentes.`);
  } catch (error) {
    if (error.code === 6 || error.code === 'already-exists') {
      throw new Error('El catálogo ya contiene documentos. No se modificó ningún producto.');
    }
    throw error;
  }
}

seedProducts().catch(error => {
  console.error('No se pudo importar el catálogo:', error.message);
  process.exitCode = 1;
});
