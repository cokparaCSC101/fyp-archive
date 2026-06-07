// =====================================================================
//  Database connection pool (mysql2/promise)
//  Reads connection details from environment variables (.env).
// =====================================================================
const mysql = require('mysql2/promise');
require('dotenv').config();

// Hosted MySQL providers (Aiven, TiDB Cloud, etc.) require an encrypted
// connection. Set DB_SSL=true in those environments. Left unset locally,
// so local development connects without SSL exactly as before.
const useSSL = process.env.DB_SSL === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fyp_archive',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Encrypt traffic to the hosted database when DB_SSL is enabled.
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

// Verify the connection once at startup so failures are obvious early.
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✓ MySQL connected to database:', process.env.DB_NAME || 'fyp_archive');
    conn.release();
  } catch (err) {
    console.error('✗ MySQL connection failed:', err.message);
  }
})();

module.exports = pool;
