const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createEmailBodies,
  sendReservationEmail,
  validateEmailContent
} = require('../services/email.service');

test('validates editable email content and rejects header injection', () => {
  const content = {
    asunto: 'Tu reserva fue confirmada',
    titulo: '¡Gracias por reservar!',
    mensaje: 'Te esperamos pronto.'
  };

  assert.equal(validateEmailContent(content), true);
  assert.equal(validateEmailContent({ ...content, asunto: 'Hola\r\nBcc: atacante@example.com' }), false);
  assert.equal(validateEmailContent({ ...content, extra: 'campo' }), false);
  assert.equal(validateEmailContent({ ...content, mensaje: ' ' }), false);
});

test('creates safe HTML and plain-text reservation email bodies', () => {
  const bodies = createEmailBodies(
    { nombreContacto: '<Ana>' },
    'id&123',
    {
      asunto: 'Reserva',
      titulo: '<Confirmada>',
      mensaje: 'Primera línea\n<script>alert(1)</script>'
    }
  );

  assert.match(bodies.html, /&lt;Confirmada&gt;/);
  assert.match(bodies.html, /Hola &lt;Ana&gt;/);
  assert.match(bodies.html, /id&amp;123/);
  assert.doesNotMatch(bodies.html, /<script>/);
  assert.match(bodies.html, /Primera línea<br>&lt;script&gt;/);
  assert.match(bodies.text, /Referencia de reserva: id&123/);
});

test('requires Gmail SMTP credentials before attempting delivery', async () => {
  const previousUser = process.env.SMTP_USER;
  const previousPassword = process.env.SMTP_PASSWORD;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;

  try {
    await assert.rejects(
      sendReservationEmail(
        { nombreContacto: 'Ana', correoContacto: 'ana@example.com' },
        'reserva-1',
        { asunto: 'Asunto', titulo: 'Título', mensaje: 'Mensaje' }
      ),
      { status: 503, message: 'Configura SMTP_USER y SMTP_PASSWORD en backend/.env para enviar correos.' }
    );
  } finally {
    if (previousUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = previousUser;
    if (previousPassword === undefined) delete process.env.SMTP_PASSWORD;
    else process.env.SMTP_PASSWORD = previousPassword;
  }
});
