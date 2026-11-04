# Firestore

El proyecto utiliza Firebase Admin SDK desde el backend. Configura `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_UID` y Application Default Credentials en el entorno; no guardes la clave de cuenta de servicio en este repositorio. Para desarrollo con emuladores usa `FIRESTORE_EMULATOR_HOST` y `FIREBASE_AUTH_EMULATOR_HOST`.

El backend administra `productos`, `pedidos` y `reservas`; el historial de mensajes existentes se lee desde `reservas/{reservaId}/correos`. La API comprueba el token Firebase y el UID de administrador antes de operaciones administrativas. Firebase Admin SDK omite las reglas Firestore, por lo que no se debe desplegar una API sin estas comprobaciones. Las reglas deniegan todas las lecturas y escrituras directas desde el navegador; todas las operaciones deben pasar por la API.

Para poblar el catálogo inicial, comprueba primero que `productos` esté vacía y ejecuta `npm run seed:products`. No se importan automáticamente datos de `localStorage`: ese almacenamiento solo existe en el navegador que lo creó. Las reglas se deben revisar y desplegar por separado; nunca se ejecuta un despliegue durante el arranque de la aplicación.
