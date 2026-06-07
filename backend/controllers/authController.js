// =====================================================================
//  Auth controller — registration and login
//  Passwords are hashed with bcrypt; sessions use stateless JWTs.
// =====================================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const ALLOWED_ROLES = ['student', 'lecturer', 'hod', 'admin'];

// Helper: sign a JWT for a user record
const signToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, full_name: user.full_name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/register
const register = async (req, res) => {
  try {
    let { full_name, email, password, role } = req.body;

    // --- Validation ---
    if (!full_name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Full name, email and password are required.' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Default new sign-ups to 'student'. Only allow non-admin roles via self-registration.
    role = ALLOWED_ROLES.includes(role) && role !== 'admin' ? role : 'student';

    // --- Check for existing account ---
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // --- Hash & insert ---
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [full_name, email, password_hash, role]
    );

    const user = { user_id: result.insertId, full_name, email, role };
    const token = signToken(user);

    return res.status(201).json({ message: 'Registration successful.', token, user });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const userRow = rows[0];
    const match = await bcrypt.compare(password, userRow.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = {
      user_id: userRow.user_id,
      full_name: userRow.full_name,
      email: userRow.email,
      role: userRow.role,
    };
    const token = signToken(user);

    return res.json({ message: 'Login successful.', token, user });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

module.exports = { register, login };
