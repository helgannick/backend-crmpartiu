import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS,
  },
});

export async function sendCronAlert(label, error) {
  if (!process.env.ALERT_EMAIL_USER || !process.env.ALERT_EMAIL_PASS) return;

  const to = process.env.ALERT_EMAIL_USER;
  const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  await transporter.sendMail({
    from: `"CRM Partiu" <${to}>`,
    to,
    subject: `❌ Cron falhou: ${label} — ${date}`,
    text: `O job "${label}" falhou em ${date}.\n\nErro:\n${error}\n\nVerifique os logs no Render para mais detalhes.`,
  });
}
