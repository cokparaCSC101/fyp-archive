// =====================================================================
//  FYP ARCHIVE SYSTEM — BACKEND API SERVER
//  Node.js + Express + MySQL + JWT
//
//  Entry point. Wires together middleware and route modules.
// =====================================================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Initialise the DB pool (also runs a connection test on startup)
const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const requestRoutes = require('./routes/requestRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// --- Global middleware ---
app.use(cors()); // allows the React web app and Expo mobile app to call the API
app.use(express.json());
app.use(morgan('dev')); // request logging in the console

// --- Health check ---
app.get('/', (req, res) => {
  res.json({
    name: 'FYP Archive System API',
    status: 'running',
    docs: 'See README.md for the full list of endpoints.',
  });
});

// --- Database keep-alive / health check ---
// Runs a trivial query so that pinging this route (e.g. from an uptime
// monitor every ~10 minutes) keeps BOTH the API host and the managed
// database awake on free hosting tiers that sleep when idle.
app.get('/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/audit', auditRoutes);

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// --- Centralised error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
