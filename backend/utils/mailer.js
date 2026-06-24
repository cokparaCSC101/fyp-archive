// =====================================================================
//  Mailer utility — sends the sign-up verification code by email.
//
//  Uses Gmail via an App Password (set EMAIL_USER + EMAIL_PASS in .env).
//  If those are not set, it falls back to printing the code to the
//  server console so the flow can still be tested in development.
// =====================================================================
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const hasCreds = !!(EMAIL_USER && EMAIL_PASS);

let transporter = null;
if (hasCreds) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

const APP_NAME = 'FYP Archive — Pan-Atlantic University';

async function sendVerificationEmail(to, fullName, code) {
  // Development fallback: no email configured. Log the code so the
  // verification flow can still be completed and tested locally.
  if (!transporter) {
    console.log(
      `\n──────────────────────────────────────────────\n` +
      `[DEV EMAIL] Verification code for ${to}: ${code}\n` +
      `Set EMAIL_USER and EMAIL_PASS to send real emails.\n` +
      `──────────────────────────────────────────────\n`
    );
    return { delivered: false, dev: true };
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;
              border:1px solid #e7ddcd;border-radius:12px;overflow:hidden">
    <div style="background:#1a1410;color:#f5f0e7;padding:20px 24px">
      <div style="font-size:18px;font-weight:700">FYP Archive</div>
      <div style="font-size:12px;opacity:.8">Computer Science Department, Pan-Atlantic University</div>
    </div>
    <div style="padding:24px;color:#1a1410">
      <p>Hi ${fullName || 'there'},</p>
      <p>Use this code to verify your account:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;
                  text-align:center;background:#f3e8d4;color:#8a5f1c;
                  padding:16px;border-radius:10px;margin:16px 0">${code}</div>
      <p style="color:#4a4038;font-size:14px">This code expires in 15 minutes.
         If you didn't create an account, you can ignore this email.</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"${APP_NAME}" <${EMAIL_USER}>`,
    to,
    subject: 'Your FYP Archive verification code',
    text: `Hi ${fullName || 'there'}, your FYP Archive verification code is ${code}. It expires in 15 minutes.`,
    html,
  });
  return { delivered: true };
}

module.exports = { sendVerificationEmail, emailConfigured: hasCreds };
