# Correo en Render gratuito

GitHub Pages llama al backend de Render. Las credenciales de `backend/.env` en el PC no se copian al publicar código.

El backend admite Brevo por HTTPS (`https://api.brevo.com/v3/smtp/email`) y conserva SMTP para pruebas locales. Todos los envíos comparten el servicio: correos manuales, cambios de estado y alertas al administrador.

## Activación

1. Crear o entrar en una cuenta de Brevo y activar su servicio de correo transaccional.
2. Añadir un remitente y completar la verificación que solicita Brevo. Usar una dirección de un dominio propio autenticado si el proveedor la requiere. No asumir que una dirección Gmail puede autenticarse como dominio propio. Configurar `MAIL_REPLY_TO` con el Gmail del administrador permite recibir allí las respuestas aunque el remitente autorizado sea distinto.
3. Crear una clave de API (no una clave SMTP) y guardarla solo en el servidor.
4. En Render → servicio paletas → Environment, configurar:

```
EMAIL_PROVIDER=brevo
BREVO_API_KEY=<clave privada, introducir directamente en Render>
MAIL_FROM_EMAIL=<remitente verificado en Brevo>
MAIL_REPLY_TO=julianasalazarmendez@gmail.com
SMTP_FROM_NAME=Paletas de Hielo
```

5. El código actualizado debe estar desplegado en Render para utilizar estas variables. Los cambios locales no actualizan Render. No publicar la clave ni el archivo `.env` en GitHub.
6. En Notificaciones, usar Enviar correo de prueba y revisar tanto el historial de Brevo como la bandeja de entrada y spam del administrador.

Las cuentas de Render y GitHub usan `est.juliana.salazarm@unimilitar.edu.co`. Esto no cambia el destinatario de las alertas: el backend consulta el correo actual del UID administrador en Firebase, actualmente `julianasalazarmendez@gmail.com`. Los correos de pedidos y reservas van al contacto real del cliente.

La API devuelve un identificador cuando acepta el mensaje. Esto no garantiza que llegue a la bandeja de entrada. No se cambia automáticamente a SMTP si falla la API, para evitar bloqueos o duplicados. Ante una respuesta incierta, revisar primero el historial del proveedor.
