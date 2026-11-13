const nodemailer = require('nodemailer');

const EMAIL_FIELDS = new Set(['asunto', 'titulo', 'mensaje']);

function validateEmailContent(content) {
  return Boolean(content) &&
    Object.keys(content).length === EMAIL_FIELDS.size &&
    Object.keys(content).every(key => EMAIL_FIELDS.has(key)) &&
    typeof content.asunto === 'string' &&
    content.asunto.trim().length > 0 &&
    content.asunto.trim().length <= 160 &&
    !/[\r\n]/.test(content.asunto) &&
    typeof content.titulo === 'string' &&
    content.titulo.trim().length > 0 &&
    content.titulo.trim().length <= 160 &&
    typeof content.mensaje === 'string' &&
    content.mensaje.trim().length > 0 &&
    content.mensaje.trim().length <= 5000;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function createEmailBodies(customerName, reference, content, referenceLabel = 'Referencia') {
  const name = escapeHtml(customerName);
  const title = escapeHtml(content.titulo.trim());
  const message = escapeHtml(content.mensaje.trim()).replace(/\r?\n/g, '<br>');
  const label = escapeHtml(referenceLabel);
  const escapedReference = escapeHtml(reference);

  return {
    text: `${content.titulo.trim()}\n\nHola ${customerName},\n\n${content.mensaje.trim()}\n\n${referenceLabel}: ${reference}`,
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f7f5f2;font-family:Arial,sans-serif;color:#302b29">
    <main style="max-width:600px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
      <p style="margin:0 0 20px;color:#8a5b43;font-weight:700">Paletas de Hielo</p>
      <h1 style="font-size:24px">${title}</h1>
      <p>Hola ${name},</p>
      <p style="line-height:1.6">${message}</p>
      <p style="margin-top:24px;color:#665d58">${label}: ${escapedReference}</p>
    </main>
  </body>
</html>`
  };
}

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw Object.assign(
      new Error('Configura SMTP_USER y SMTP_PASSWORD en backend/.env para enviar correos.'),
      { status: 503 }
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE !== 'false',
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
    auth: { user, pass: password.replace(/\s/g, '') }
  });
}

async function sendCustomerEmail(customer, reference, content, referenceLabel = 'Referencia') {
  const bodies = createEmailBodies(customer.name, reference, content, referenceLabel);
  const fromName = process.env.SMTP_FROM_NAME || 'Paletas de Hielo';
  const provider = process.env.EMAIL_PROVIDER || (process.env.BREVO_API_KEY || process.env.RENDER === 'true' ? 'brevo' : 'smtp');
  if (provider === 'brevo') {
    return sendWithBrevo(customer, content, bodies, fromName);
  }
  if (provider !== 'smtp') {
    throw Object.assign(new Error('El proveedor de correo configurado no es válido.'), { status: 503 });
  }
  if (process.env.RENDER === 'true' && process.env.IS_RENDER_FREE === 'true') {
    throw Object.assign(new Error('Configura EMAIL_PROVIDER=brevo para enviar correos por HTTPS desde Render gratuito.'), { status: 503 });
  }
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: { name: fromName, address: process.env.SMTP_USER },
    to: customer.email,
    subject: content.asunto.trim(),
    ...bodies
  });
  if (info.rejected?.length || (Array.isArray(info.accepted) && !info.accepted.length)) {
    throw Object.assign(new Error('El servidor de correo rechazó al destinatario.'), { status: 502 });
  }
  return { messageId: info.messageId || null };
}

async function sendWithBrevo(customer, content, bodies, fromName) {
  const key = process.env.BREVO_API_KEY;
  const sender = process.env.MAIL_FROM_EMAIL;
  if (!key || !sender) {
    throw Object.assign(new Error('Falta activar el servicio de correo del servidor: configura BREVO_API_KEY y MAIL_FROM_EMAIL en Render y verifica el remitente en Brevo.'), { status: 503 });
  }
  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: fromName, email: sender },
        to: [{ email: customer.email, name: customer.name }],
        replyTo: { email: process.env.MAIL_REPLY_TO || sender, name: fromName },
        subject: content.asunto.trim(),
        htmlContent: bodies.html,
        textContent: bodies.text
      }),
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    throw Object.assign(new Error('No se pudo confirmar el envío con el servicio de correo. Revisa el historial del proveedor antes de reintentar.'), { status: 502 });
  }
  // No mostramos respuestas del proveedor: pueden incluir datos personales.
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      401: 'La clave de correo del servidor no es válida. Revisa BREVO_API_KEY en Render.',
      403: 'El proveedor no autorizó el envío. Revisa la activación de la cuenta y el remitente en Brevo.',
      400: 'El proveedor rechazó los datos. Comprueba que MAIL_FROM_EMAIL sea un remitente verificado en Brevo.',
      429: 'Se alcanzó el límite de envío del servicio de correo. Inténtalo más tarde.'
    };
    throw Object.assign(new Error(messages[response.status] || 'El servicio de correo no pudo aceptar el mensaje.'), { status: 502 });
  }
  if (typeof result.messageId !== 'string' || !result.messageId) {
    throw Object.assign(new Error('El servicio no confirmó el identificador del correo. Revisa su historial antes de reintentar.'), { status: 502 });
  }
  return { messageId: result.messageId };
}

function sendReservationEmail(reservation, reservationId, content) {
  return sendCustomerEmail({
    email: reservation.correoContacto,
    name: reservation.nombreContacto
  }, reservationId, content, 'Referencia de reserva');
}

module.exports = {
  createEmailBodies,
  sendCustomerEmail,
  sendReservationEmail,
  validateEmailContent
};
