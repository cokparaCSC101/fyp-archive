// =====================================================================
//  Audit logging helper.
//  Records an action in the audit_log table. Best-effort: any failure
//  is logged to the console but never interrupts the main request.
// =====================================================================
const pool = require('../config/db');

async function logAudit({ user_id = null, action, project_id = null, details = null }) {
  try {
    await pool.query(
      'INSERT INTO audit_log (user_id, action, project_id, details) VALUES (?, ?, ?, ?)',
      [user_id, action, project_id, details ? String(details).slice(0, 255) : null]
    );
  } catch (err) {
    console.error('audit log failed:', err.message);
  }
}

module.exports = { logAudit };
