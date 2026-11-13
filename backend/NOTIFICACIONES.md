# Seguridad y notificaciones

Los cambios de contraseña se realizan en el navegador con Firebase Authentication: contraseña actual, reautenticación y `updatePassword`. Las contraseñas no se envían a la API del proyecto ni se guardan en Firestore.

Las preferencias se guardan en `preferenciasAdmin/{FIREBASE_ADMIN_UID}` mediante rutas protegidas con el token del administrador:

- `GET /api/admin/notifications`: preferencias y correo actual.
- `PUT /api/admin/notifications`: exactamente cuatro booleanos: `compras`, `contacto`, `correos`, `eventos`.
- `POST /api/admin/notifications/test`: correo de prueba al administrador, independientemente de los interruptores.

El destinatario siempre se obtiene de Firebase Authentication con el UID del administrador. No se acepta un destinatario en el cuerpo de estas peticiones. Las nuevas preferencias comienzan activadas para las cuatro categorías.

Eventos conectados:

- Compras: pedido nuevo guardado desde el checkout. Importar pedidos antiguos no genera alertas.
- Contacto: mensaje nuevo del formulario de Contacto (`POST /api/contact`), guardado en `contactos`.
- Correos informativos: confirmación de un correo enviado a un cliente desde pedidos o reservas. No hay una fuente de boletines de noticias en este proyecto.
- Eventos y actividades: solicitud nueva de evento desde el formulario de cotización.

Las alertas se registran en `notificacionesAdmin` con estado `enviando`, `enviado` o `fallido`. `enviado` significa que SMTP aceptó el correo; no confirma entrega en bandeja de entrada. Un fallo de correo no revierte el pedido o mensaje ya guardado. No se reintentan envíos automáticamente; revisar los fallidos al detectar un problema de SMTP.

Requiere el backend actualizado en ejecución, credenciales válidas de Firebase Admin y las variables SMTP existentes. No publicar secretos en el frontend. El botón de prueba comprueba el envío real sin crear pedidos ni cambiar contraseñas.

Prueba manual: entrar en Notificaciones, guardar una opción desactivada, recargar y verificar persistencia. Enviar correo de prueba. Crear un pedido o solicitud de prueba para comprobar su categoría. En Seguridad, probar primero confirmación distinta o contraseña actual incorrecta y luego completar personalmente un cambio válido.
