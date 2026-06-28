// =====================================================================
//  Auth controller — registration, email verification, and login.
//  Passwords are hashed with bcrypt; sessions use stateless JWTs.
//  New sign-ups must verify their email with a 6-digit code before
//  they can log in.
// =====================================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendVerificationEmail } = require('../utils/mailer');

const ALLOWED_ROLES = ['student', 'lecturer', 'hod', 'admin'];
const CODE_TTL_MINUTES = 15;

const signToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, full_name: user.full_name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// 6-digit numeric code + an expiry timestamp
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));
const newExpiry = () => new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

const publicUser = (row) => ({
  user_id: row.user_id,
  full_name: row.full_name,
  email: row.email,
  role: row.role,
});

// POST /api/auth/register
const register = async (req, res) => {
  try {
    let { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Full name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    email = email.trim().toLowerCase();

    // Self-registration may pick any non-admin role.
    role = ALLOWED_ROLES.includes(role) && role !== 'admin' ? role : 'student';

    const [existing] = await pool.query(
      'SELECT user_id, is_verified FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      // If the account exists but was never verified, let them re-trigger a code.
      if (existing[0].is_verified === 0) {
        const code = newCode();
        await pool.query(
          'UPDATE users SET verification_code = ?, verification_expires = ? WHERE user_id = ?',
          [code, newExpiry(), existing[0].user_id]
        );
        let resent = true;
        try { await sendVerificationEmail(email, full_name, code); }
        catch (e) { resent = false; console.error('verification email failed:', e.message); }
        return res.status(200).json({
          message: resent
            ? 'This email is already registered but not verified. We have sent a new code.'
            : 'This email is already registered but not verified. Use \u201cResend code\u201d to try again.',
          requiresVerification: true,
          email,
          emailSent: resent,
        });
      }
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const code = newCode();
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified, verification_code, verification_expires)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [full_name, email, password_hash, role, code, newExpiry()]
    );

    let emailSent = true;
    try {
      await sendVerificationEmail(email, full_name, code);
    } catch (e) {
      emailSent = false;
      console.error('verification email failed:', e.message);
    }

    return res.status(201).json({
      message: emailSent
        ? 'Account created. Check your email for a 6-digit verification code.'
        : 'Account created, but we could not send the code right now. Use \u201cResend code\u201d on the next screen.',
      requiresVerification: true,
      email,
      emailSent,
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

// POST /api/auth/verify-email   { email, code }
const verifyEmail = async (req, res) => {
  try {
    let { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }
    email = email.trim().toLowerCase();
    code = String(code).trim();

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No account found for this email.' });
    }
    const row = rows[0];

    if (row.is_verified === 1) {
      return res.status(400).json({ message: 'This account is already verified. Please sign in.' });
    }
    if (!row.verification_code || row.verification_code !== code) {
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }
    if (!row.verification_expires || new Date(row.verification_expires) < new Date()) {
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    }

    await pool.query(
      'UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires = NULL WHERE user_id = ?',
      [row.user_id]
    );

    // Make a verified lecturer selectable as a project supervisor (best-effort).
    if (row.role === 'lecturer') {
      try {
        await pool.query(
          "INSERT IGNORE INTO supervisors (full_name, department, user_id) VALUES (?, 'Computer Science', ?)",
          [row.full_name, row.user_id]
        );
      } catch (e) {
        console.error('supervisor sync error:', e.message);
      }
    }

    const user = publicUser(row);
    const token = signToken(user);
    return res.json({ message: 'Email verified. You are now signed in.', token, user });
  } catch (err) {
    console.error('verifyEmail error:', err);
    return res.status(500).json({ message: 'Server error during verification.' });
  }
};

// POST /api/auth/resend-code   { email }
const resendCode = async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    email = email.trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT user_id, full_name, is_verified FROM users WHERE email = ?',
      [email]
    );
    // Generic response either way, so we don't reveal which emails exist.
    if (rows.length > 0 && rows[0].is_verified === 0) {
      const code = newCode();
      await pool.query(
        'UPDATE users SET verification_code = ?, verification_expires = ? WHERE user_id = ?',
        [code, newExpiry(), rows[0].user_id]
      );
      try { await sendVerificationEmail(email, rows[0].full_name, code); }
      catch (e) { console.error('verification email failed:', e.message); }
    }
    return res.json({ message: 'If that account exists and is unverified, a new code has been sent.' });
  } catch (err) {
    console.error('resendCode error:', err);
    return res.status(500).json({ message: 'Server error while resending the code.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    email = email.trim().toLowerCase();

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const row = rows[0];
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Block unverified accounts and point the client at the verify step.
    if (row.is_verified === 0) {
      const code = newCode();
      await pool.query(
        'UPDATE users SET verification_code = ?, verification_expires = ? WHERE user_id = ?',
        [code, newExpiry(), row.user_id]
      );
      try { await sendVerificationEmail(email, row.full_name, code); }
      catch (e) { console.error('verification email failed:', e.message); }
      return res.status(403).json({
        message: 'Your email is not verified yet. Please verify with the code we emailed you (use \u201cResend code\u201d if needed).',
        requiresVerification: true,
        email,
      });
    }

    const user = publicUser(row);
    const token = signToken(user);
    return res.json({ message: 'Login successful.', token, user });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

module.exports = { register, verifyEmail, resendCode, login };
