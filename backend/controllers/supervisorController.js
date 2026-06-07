// =====================================================================
//  Supervisor controller
//  GET /api/supervisors — used to populate the supervisor dropdown
//  in the admin "add / edit project" form.
// =====================================================================
const pool = require('../config/db');

const getSupervisors = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT supervisor_id, full_name, department FROM supervisors ORDER BY full_name ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('getSupervisors error:', err);
    return res.status(500).json({ message: 'Server error while fetching supervisors.' });
  }
};

module.exports = { getSupervisors };
