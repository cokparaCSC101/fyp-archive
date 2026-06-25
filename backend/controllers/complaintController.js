// =====================================================================
//  Complaint controller — user feedback / complaints to the admin.
//    createComplaint (any user) : submit feedback / report an issue
//    myComplaints    (any user) : track the status of own submissions
//    listComplaints  (admin)    : all complaints
//    updateComplaint (admin)    : change status / add a response
//  Status flow: open -> seen -> in_progress -> resolved
// =====================================================================
const pool = require('../config/db');

const COMPLAINT_SELECT = `
  SELECT c.complaint_id, c.subject, c.message, c.status, c.admin_response,
         c.project_id, p.title AS project_title,
         c.user_id, u.full_name AS user_name, u.email AS user_email, u.role AS user_role,
         c.created_at, c.updated_at
  FROM complaints c
  JOIN users u ON c.user_id = u.user_id
  LEFT JOIN projects p ON c.project_id = p.project_id
`;
const STATUSES = ['open', 'seen', 'in_progress', 'resolved'];

const createComplaint = async (req, res) => {
  try {
    let { subject, message, project_id } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Please provide a subject and a message.' });
    }
    project_id = project_id || null;
    const [r] = await pool.query(
      'INSERT INTO complaints (user_id, project_id, subject, message) VALUES (?, ?, ?, ?)',
      [req.user.user_id, project_id, String(subject).slice(0, 200), String(message)]
    );
    return res.status(201).json({
      message: 'Thank you — your feedback has been sent to the administrator.',
      complaint_id: r.insertId,
    });
  } catch (err) {
    console.error('createComplaint error:', err);
    return res.status(500).json({ message: 'Server error while submitting your feedback.' });
  }
};

const myComplaints = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${COMPLAINT_SELECT} WHERE c.user_id = ? ORDER BY c.created_at DESC`,
      [req.user.user_id]
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error('myComplaints error:', err);
    return res.status(500).json({ message: 'Server error while fetching your complaints.' });
  }
};

const listComplaints = async (req, res) => {
  try {
    const status = (req.query.status || 'all').toLowerCase();
    let where = '';
    const params = [];
    if (status !== 'all' && STATUSES.includes(status)) {
      where = 'WHERE c.status = ?';
      params.push(status);
    }
    // unresolved first, then newest
    const [rows] = await pool.query(
      `${COMPLAINT_SELECT} ${where} ORDER BY (c.status = 'resolved') ASC, c.created_at DESC`,
      params
    );
    return res.json({ data: rows });
  } catch (err) {
    console.error('listComplaints error:', err);
    return res.status(500).json({ message: 'Server error while fetching complaints.' });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const { status, admin_response } = req.body;
    const sets = [];
    const params = [];
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
      sets.push('status = ?');
      params.push(status);
    }
    if (admin_response !== undefined) {
      sets.push('admin_response = ?');
      params.push(admin_response ? String(admin_response).slice(0, 1000) : null);
    }
    if (sets.length === 0) return res.status(400).json({ message: 'Nothing to update.' });

    params.push(req.params.id);
    const [result] = await pool.query(`UPDATE complaints SET ${sets.join(', ')} WHERE complaint_id = ?`, params);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Complaint not found.' });

    const [rows] = await pool.query(`${COMPLAINT_SELECT} WHERE c.complaint_id = ?`, [req.params.id]);
    return res.json({ message: 'Complaint updated.', complaint: rows[0] });
  } catch (err) {
    console.error('updateComplaint error:', err);
    return res.status(500).json({ message: 'Server error while updating the complaint.' });
  }
};

module.exports = { createComplaint, myComplaints, listComplaints, updateComplaint };
