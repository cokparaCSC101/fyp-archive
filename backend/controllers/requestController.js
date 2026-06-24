// =====================================================================
//  Request controller — the lecturer -> HoD approval workflow.
//
//    listRequests   (admin/hod) : pending (or all) requests to review
//    myRequests     (staff)     : the caller's own requests + status
//    approveRequest (admin/hod) : apply the create/update/delete
//    denyRequest    (admin/hod) : reject with an optional reason
// =====================================================================
const pool = require('../config/db');
const { logAudit } = require('../utils/audit');

const REQ_SELECT = `
  SELECT
    r.request_id, r.action, r.target_project_id,
    r.title, r.student_name, r.year_completed, r.abstract,
    r.project_link, r.project_webapp_link, r.supervisor_id,
    s.full_name AS supervisor_name,
    r.similarity_score, r.similarity_info,
    r.status, r.requested_by,
    u.full_name AS requested_by_name, u.email AS requested_by_email,
    r.reviewed_by, ru.full_name AS reviewed_by_name,
    r.reviewed_at, r.review_note, r.created_at,
    tp.title AS target_title
  FROM project_requests r
  JOIN users u ON r.requested_by = u.user_id
  LEFT JOIN users ru ON r.reviewed_by = ru.user_id
  LEFT JOIN supervisors s ON r.supervisor_id = s.supervisor_id
  LEFT JOIN projects tp ON r.target_project_id = tp.project_id
`;

// GET /api/requests?status=pending|approved|denied|all   (admin/hod)
const listRequests = async (req, res) => {
  try {
    const status = (req.query.status || 'pending').toLowerCase();
    let where = '';
    const params = [];
    if (status !== 'all') {
      where = 'WHERE r.status = ?';
      params.push(status);
    }
    const [rows] = await pool.query(`${REQ_SELECT} ${where} ORDER BY r.created_at DESC`, params);
    return res.json({ data: rows });
  } catch (err) {
    console.error('listRequests error:', err);
    return res.status(500).json({ message: 'Server error while fetching requests.' });
  }
};

// GET /api/requests/mine   (any staff member: their own requests)
const myRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${REQ_SELECT} WHERE r.requested_by = ? ORDER BY r.created_at DESC`,
      [req.user.user_id]
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error('myRequests error:', err);
    return res.status(500).json({ message: 'Server error while fetching your requests.' });
  }
};

// POST /api/requests/:id/approve   (admin/hod)
const approveRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM project_requests WHERE request_id = ? FOR UPDATE',
      [req.params.id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }
    const r = rows[0];
    if (r.status !== 'pending') {
      await conn.rollback();
      return res.status(400).json({ message: `This request has already been ${r.status}.` });
    }

    let resultMsg = '';
    let affectedProjectId = r.target_project_id;

    if (r.action === 'create') {
      const [ins] = await conn.query(
        `INSERT INTO projects
           (title, student_name, year_completed, abstract, project_link, project_webapp_link, supervisor_id, added_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.title, r.student_name, r.year_completed, r.abstract, r.project_link, r.project_webapp_link, r.supervisor_id, r.requested_by]
      );
      affectedProjectId = ins.insertId;
      resultMsg = 'Project created and published to the archive.';
    } else if (r.action === 'update') {
      const [upd] = await conn.query(
        `UPDATE projects SET
           title = ?, student_name = ?, year_completed = ?, abstract = ?,
           project_link = ?, project_webapp_link = ?, supervisor_id = ?
         WHERE project_id = ?`,
        [r.title, r.student_name, r.year_completed, r.abstract, r.project_link, r.project_webapp_link, r.supervisor_id, r.target_project_id]
      );
      if (upd.affectedRows === 0) {
        await conn.rollback();
        return res.status(400).json({ message: 'The target project no longer exists.' });
      }
      resultMsg = 'Project updated in the archive.';
    } else if (r.action === 'delete') {
      // Detach this request from the project first, so the project's
      // ON DELETE CASCADE does not remove this row — we keep it as history.
      await conn.query(
        'UPDATE project_requests SET target_project_id = NULL WHERE request_id = ?',
        [r.request_id]
      );
      await conn.query('DELETE FROM projects WHERE project_id = ?', [r.target_project_id]);
      affectedProjectId = null;
      resultMsg = 'Project removed from the archive.';
    }

    await conn.query(
      `UPDATE project_requests
         SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
       WHERE request_id = ?`,
      [req.user.user_id, r.request_id]
    );

    await conn.commit();
    await logAudit({
      user_id: req.user.user_id,
      action: `approve_${r.action}`,
      project_id: affectedProjectId,
      details: `request #${r.request_id} by user ${r.requested_by}`,
    });
    return res.json({ message: resultMsg, request_id: r.request_id, status: 'approved' });
  } catch (err) {
    await conn.rollback();
    console.error('approveRequest error:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'The selected supervisor no longer exists.' });
    }
    return res.status(500).json({ message: 'Server error while approving the request.' });
  } finally {
    conn.release();
  }
};

// POST /api/requests/:id/deny   (admin/hod)   { review_note }
const denyRequest = async (req, res) => {
  try {
    const note = (req.body.review_note || '').slice(0, 500) || null;
    const [rows] = await pool.query(
      'SELECT status, action, requested_by FROM project_requests WHERE request_id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Request not found.' });
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ message: `This request has already been ${rows[0].status}.` });
    }

    await pool.query(
      `UPDATE project_requests
         SET status = 'denied', reviewed_by = ?, reviewed_at = NOW(), review_note = ?
       WHERE request_id = ?`,
      [req.user.user_id, note, req.params.id]
    );
    await logAudit({
      user_id: req.user.user_id,
      action: `deny_${rows[0].action}`,
      details: `request #${req.params.id} by user ${rows[0].requested_by}`,
    });
    return res.json({ message: 'Request denied.', request_id: Number(req.params.id), status: 'denied' });
  } catch (err) {
    console.error('denyRequest error:', err);
    return res.status(500).json({ message: 'Server error while denying the request.' });
  }
};

module.exports = { listRequests, myRequests, approveRequest, denyRequest };
