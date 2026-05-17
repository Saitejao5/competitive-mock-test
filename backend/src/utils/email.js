import nodemailer from 'nodemailer';

function resetTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined
    });
  }

  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendPasswordResetEmail({ to, token }) {
  const baseUrl = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const from = process.env.EMAIL_FROM || 'AI Exam Platform <no-reply@exam-platform.local>';

  const info = await resetTransport().sendMail({
    from,
    to,
    subject: 'Reset your AI Exam Platform password',
    text: `Use this link to reset your password. It expires in 20 minutes: ${resetUrl}`,
    html: `<p>Use this link to reset your password. It expires in 20 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[AUTH] Password reset email for ${to}: ${resetUrl}`);
    console.log(`[AUTH] Dev email payload: ${info.message}`);
  }
}

