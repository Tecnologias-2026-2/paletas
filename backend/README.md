# Backend de Paletas de Hielo

El backend expone una API HTTP y sirve las páginas y los recursos desde `../frontend`. El almacenamiento persistente es Firestore; no es necesario iniciar MySQL.

## Estructura

- `server.js`: servidor HTTP, CORS y montaje de rutas.
- `routes/`: despacho de peticiones HTTP (`admin`, `reservas`, `pedidos` y `productos`).
- `middleware/admin-auth.js`: validación del token y UID de administrador.
- `controllers/`: controladores de `user` (cuenta administradora), `reservation` y `order`.
- `models/`: acceso a Firebase Auth para el administrador y a Firestore para reservas y pedidos.
- `database/connection.js`: inicialización compartida de Firebase Admin y Firestore.
- `database/`: datos de semilla y script opcional del catálogo; el catálogo no usa controller/model.
- `utils/`: lectura de JSON, respuestas HTTP y serialización.

## Requisitos

- Node.js 22 o posterior.
- Acceso de Google Cloud al proyecto Firebase `paleteria-60039`.
- Una cuenta de servicio con permisos de Firestore para el servidor. No copies credenciales al repositorio.

## Configuración local

1. Instala dependencias: `npm install`.
2. Completa `backend/.env` (se ignora en Git). Define `FIREBASE_ADMIN_UID` con el UID administrador y conserva el ID del proyecto.
3. Configura Application Default Credentials en el entorno. En desarrollo local puedes definir `GOOGLE_APPLICATION_CREDENTIALS` con la ruta a un JSON de cuenta de servicio fuera del repositorio. También puedes iniciar los emuladores de Firebase y definir `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` y `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
4. Para enviar correos, define `SMTP_USER` con tu dirección Gmail y `SMTP_PASSWORD` con una contraseña de aplicación de Google (no la contraseña normal de Gmail). Activa la verificación en dos pasos de la cuenta y crea una contraseña de aplicación desde la seguridad de tu cuenta de Google. `SMTP_HOST`, `SMTP_PORT` y `SMTP_SECURE` usan por defecto `smtp.gmail.com`, `465` y `true`. Mantén todas estas variables solo en `backend/.env`; nunca publiques la contraseña.
5. Inicia el sitio y la API desde `backend`: `npm run dev`. Abre `http://localhost:3000`. Para importar `localStorage` creado previamente por Live Server, abre también la misma vista administrativa bajo ese origen (`http://localhost:5500`) mientras el backend sigue activo; ese puerto ya está incluido en CORS.

Al iniciar, el servidor comprueba Firestore y muestra `Base de datos Firestore conectada.` o un error de conexión en la consola. El servidor usa Admin SDK, por lo que las reglas Firestore no autorizan las solicitudes del backend. La API verifica tokens Firebase y comprueba el UID administrador antes de leer o cambiar pedidos, productos, reservas y el historial de correos. Las reglas del cliente deniegan el acceso directo a Firestore.

## Datos y migración

- Colecciones: `productos`, `pedidos` y `reservas`; el historial de correo permanece en `reservas/{id}/correos`.
- Las solicitudes de cotización se validan en el servidor antes de guardarse en `reservas`.
- Los precios, empaques, envío y totales de pedidos se calculan nuevamente en el servidor; no se confía en los totales enviados desde el navegador.
- El catálogo inicial está en `database/catalog-seed.js`. Ejecuta `npm run seed:products` **solo cuando la colección `productos` esté vacía**. El script no sobrescribe documentos existentes.
- `localStorage` de pedidos y catálogo pertenece al perfil de cada navegador, no a una base de datos central. Al abrir sus vistas como administrador, la aplicación intenta migrar esos datos de ese mismo navegador y los conserva si la importación falla. El importador de productos solo funciona si la colección `productos` está vacía; no mezcles ese método con el catálogo de semilla. No se conectó ni modificó Firestore remotamente durante esta preparación.

## Desplegar en Render

Este proyecto necesita un **Web Service**: además de la API Node.js, `server.js` sirve las páginas del frontend. No elijas Static Site ni Private Service; Firestore sigue siendo la base de datos y no se migra a Render.

1. Sube la rama del proyecto a GitHub y en Render selecciona **New > Web Service** y conecta ese repositorio.
2. Deja **Root Directory** vacío si la raíz del repositorio contiene `backend/` y `frontend/`. Si ambos están dentro de una subcarpeta, usa esa carpeta como raíz.
3. Configura **Build Command** como `cd backend && npm ci` y **Start Command** como `cd backend && npm start`. Usa `/api/health` como health check path.
4. En **Environment**, configura `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_UID`, `SMTP_USER` y `SMTP_PASSWORD`. Añade `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true` y `SMTP_FROM_NAME=Paletas de Hielo` si quieres fijarlos explícitamente. Render proporciona `PORT`; no lo fijes manualmente.
5. Sube la cuenta de servicio de Firebase como **Secret File**, por ejemplo `firebase-service-account.json`, y define `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json`. No subas el JSON al repositorio ni copies el `.env` local completo.
6. Despliega y comprueba los logs y `https://<tu-servicio>.onrender.com/api/health`. El frontend y la API quedarán en el mismo dominio.

Guarda contraseñas y valores privados desde el panel de Render, no en `render.yaml` ni en GitHub. Si el envío SMTP de Gmail no logra conectar desde el servicio, habrá que usar un proveedor de correo con API HTTP o revisar las restricciones de red del plan.

## Publicar el frontend en GitHub Pages

El workflow `.github/workflows/pages.yml` publica el contenido de `frontend/` como raíz del sitio, por lo que `frontend/index.html` permanece en su carpeta y sirve como página principal. En GitHub, configura **Settings > Pages > Build and deployment > Source: GitHub Actions**. Los cambios futuros en `frontend/` de `main` ejecutan el despliegue. Pages solo sirve contenido estático; las funciones que llaman `/api` requieren que el backend esté desplegado y que `PALETAS_API_BASE` apunte a su URL pública.

## Rutas principales

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | Público |
| GET | `/api/products` | Público |
| POST/PUT/PATCH/DELETE | `/api/products` | Administrador |
| POST | `/api/products/import` | Administrador |
| POST | `/api/orders` | Público |
| GET/PATCH | `/api/orders` y `/api/orders/:id` | Administrador |
| POST | `/api/orders/import` | Administrador |
| GET/POST | `/api/orders/:id/emails` | Administrador |
| POST | `/api/reservation`, `/api/reservas` o `/api/reservations` | Público |
| GET/PATCH | `/api/reservation`, `/api/reservas` o `/api/reservations` y sus IDs | Administrador |
| GET | `/api/reservation/:id/emails`, `/api/reservas/:id/emails` o `/api/reservations/:id/emails` | Administrador |
| POST | `/api/reservation/:id/emails` | Administrador |
| GET | `/api/admin` | Administrador |

El envío toma como destinatario el correo guardado en cada pedido o reserva. El backend guarda los intentos y su estado en `pedidos/{id}/correos` o `reservas/{id}/correos`; la plantilla permite editar asunto, título y mensaje.

Las rutas de administrador requieren `Authorization: Bearer <Firebase ID token>`. Por eso, abrir `GET /api/reservation` directamente en la barra del navegador no mostrará la lista: hay que consultarla desde la sección de reservas con la sesión de administrador activa. Al iniciar sesión, la pantalla de entrada llama automáticamente a `GET /api/admin` con el token; solo abre el panel si el backend confirma la cuenta. Para comprobar peticiones posteriores, abre las herramientas de desarrollador del navegador, pestaña Network/Red, y revisa `GET /api/reservation`: debe responder `200`; la solicitud lleva `Authorization: Bearer ...`. No compartas ese valor. `GET /api/admin` devuelve solo el perfil Firebase del UID configurado. Los controladores y modelos de pedidos están creados aunque la administración de pedidos siga en construcción. `CORS_ORIGINS` admite una lista separada por comas. Para ejecutar pruebas unitarias: `npm test`.