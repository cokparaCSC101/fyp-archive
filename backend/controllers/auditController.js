// =====================================================================
//  Audit controller — lets the HoD (and admin) see who did what:
//  uploads, edits, deletions, approvals and project views.
// =====================================================================
const pool = require('../config/db');

const AUDIT_SELECT = `
  SELECT a.log_id, a.action, a.details, a.created_at,
         a.user_id, u.full_name AS user_name, u.email AS user_email, u.role AS user_role,
         a.project_id, p.title AS project_title
  FROM audit_log a
  LEFT JOIN users u ON a.user_id = u.user_id
  LEFT JOIN projects p ON a.project_id = p.project_id
`;

const listAudit = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);
    const action = (req.query.action || '').trim();
    const where = [];
    const params = [];
    if (action) { where.push('a.action = ?'); params.push(action); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `${AUDIT_SELECT} ${whereClause} ORDER BY a.created_at DESC LIMIT ?`,
      [...params, limit]
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error('listAudit error:', err);
    return res.status(500).json({ message: 'Server error while fetching the audit log.' });
  }
};

module.exports = { listAudit };
