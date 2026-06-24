// =====================================================================
//  Mailer utility — sends the sign-up verification code by email.
//
//  PRIMARY: Brevo transactional email API over HTTPS (port 443), which
//  works on hosts that block outbound SMTP (e.g. Render free tier).
//    Set BREVO_API_KEY and EMAIL_FROM (a Brevo-verified sender address).
//
//  FALLBACK (local dev): Gmail SMTP via EMAIL_USER + EMAIL_PASS.
//  LAST RESORT: print the code to the server console.
//
//  On any send failure the code is also logged to the console, so it can
//  still be read from the server logs while email delivery is set up.
// =====================================================================
const nodemailer = require('nodemailer');
try { require('dns').setDefaultResultOrder('ipv4first'); } catch (_) {}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'FYP Archive — Pan-Atlantic University';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter = null;
if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

const buildHtml = (fullName, code) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;
              border:1px solid #e7ddcd;border-radius:12px;overflow:hidden">
    <div style="background:#1a1410;color:#f5f0e7;padding:20px 24px">
      <div style="font-size:18px;font-weight:700">FYP Archive</div>
      <div style="font-size:12px;opacity:.8">Computer Science Department, Pan-Atlantic University</div>
    </div>
    <div style="padding:24px;color:#1a1410">
      <p>Hi ${fullName || 'there'},</p>
      <p>Use this code to verify your account:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;text-align:center;
                  background:#f3e8d4;color:#8a5f1c;padding:16px;border-radius:10px;margin:16px 0">${code}</div>
      <p style="color:#4a4038;font-size:14px">This code expires in 15 minutes.
         If you didn't create an account, you can ignore this email.</p>
    </div>
  </div>`;

const SUBJECT = 'Your FYP Archive verification code';
const buildText = (fullName, code) =>
  `Hi ${fullName || 'there'}, your FYP Archive verification code is ${code}. It expires in 15 minutes.`;

// --- Brevo HTTPS API ---
async function sendViaBrevo(to, fullName, code) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
        to: [{ email: to, name: fullName || to }],
        subject: SUBJECT,
        htmlContent: buildHtml(fullName, code),
        textContent: buildText(fullName, code),
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Brevo API ${resp.status}: ${body}`);
    }
    return { delivered: true, via: 'brevo' };
  } finally {
    clearTimeout(timer);
  }
}

async function sendVerificationEmail(to, fullName, code) {
  try {
    if (BREVO_API_KEY && EMAIL_FROM) {
      return await sendViaBrevo(to, fullName, code);
    }
    if (transporter) {
      await transporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to,
        subject: SUBJECT,
        text: buildText(fullName, code),
        html: buildHtml(fullName, code),
      });
      return { delivered: true, via: 'smtp' };
    }
    // Nothing configured: dev fallback.
    console.log(`\n[DEV EMAIL] Verification code for ${to}: ${code}\n`);
    return { delivered: false, dev: true };
  } catch (err) {
    // Always surface the code in the logs so the flow can still be completed.
    console.log(`\n[EMAIL FALLBACK] Verification code for ${to}: ${code}\n`);
    throw err;
  }
}

module.exports = { sendVerificationEmail };
