const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.ionos.de',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const BASE_URL = 'https://doberlug-kirchhain-historische-fotos.de';

async function sendMail(subject, html) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return;
  try {
    await transporter.sendMail({
      from: `"DoKi Benachrichtigung" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      subject,
      html,
    });
  } catch (err) {
    console.error('Mail error:', err.message);
  }
}

function notifyNewUpload(photo) {
  const title = photo.title || '(kein Titel)';
  const uploader = photo.uploader_name || 'Anonym';
  sendMail(
    `[DoKi] Neues Foto eingereicht: ${title}`,
    `<p>Ein neues Foto wurde zur Prüfung eingereicht.</p>
     <ul>
       <li><strong>Titel:</strong> ${title}</li>
       <li><strong>Eingereicht von:</strong> ${uploader}</li>
       <li><strong>Koordinaten:</strong> ${photo.lat}, ${photo.lng}</li>
     </ul>
     <p><a href="${BASE_URL}/admin">→ Zum Admin-Bereich</a></p>`
  );
}

function notifyNewChangeRequest(photoId, note) {
  sendMail(
    `[DoKi] Neuer Änderungsantrag für Foto #${photoId}`,
    `<p>Ein Nutzer hat einen Änderungsantrag für Foto #${photoId} eingereicht.</p>
     ${note ? `<p><strong>Hinweis:</strong> ${note}</p>` : ''}
     <p><a href="${BASE_URL}/admin">→ Zum Admin-Bereich</a></p>`
  );
}

module.exports = { notifyNewUpload, notifyNewChangeRequest };
