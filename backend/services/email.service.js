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
    auth: { user, pass: password.replace(/\s/g, '') }
  });
}

async function sendCustomerEmail(customer, reference, content, referenceLabel = 'Referencia') {
  const transporter = createTransporter();
  const bodies = createEmailBodies(customer.name, reference, content, referenceLabel);
  const fromName = process.env.SMTP_FROM_NAME || 'Paletas de Hielo';
  const info = await transporter.sendMail({
    from: { name: fromName, address: process.env.SMTP_USER },
    to: customer.email,
    subject: content.asunto.trim(),
    ...bodies
  });
  return { messageId: info.messageId || null };
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
