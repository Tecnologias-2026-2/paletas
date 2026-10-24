# Reservas de administración

El UID administrador es `P4AYQuUQEoVmveHWvyfWKLcUTT53` y debe coincidir en `js/reservas-firebase.js` y `firestore.rules`.

Mis reservas abre `perfiladministrador-misreservas-info.html?id=ID_REAL`. Las dos vistas esperan la sesión Firebase y deniegan acceso a otros usuarios. Firestore debe aplicar también la restricción: el control del navegador por sí solo no protege datos.

Las actualizaciones permiten únicamente `estado`, `fechaActualizacion` (fecha del servidor) y `actualizadoPor` (UID administrador). Estados: pendiente, confirmada, finalizada y cancelada. No permiten eliminar reservas ni modificar los datos del cliente.

Antes de publicar reglas, comparar con las reglas actualmente activas y conservar las necesarias para otras colecciones. Este repositorio no contenía reglas anteriores. Publicar este archivo completo denegará las colecciones no declaradas. No desplegar reglas generales que permitan escritura a cualquier usuario autenticado: las autorizaciones de reglas coincidentes se suman.

Para aplicar las reglas revisadas, usar Firebase CLI con el proyecto explícito: `firebase deploy --only firestore:rules --project paleteria-60039`. No se ha ejecutado este despliegue automáticamente.

Prueba manual en servidor local: iniciar sesión como administrador; abrir una reserva; contrastar todos los campos con Firestore; cambiar estado, recargar y verificar persistencia y filtros. Comprobar reserva inexistente, URL sin ID, sesión cerrada y cuenta distinta. La vista solo muestra confirmación al resolverse la escritura; los fallos permiten reintentar.
