// =====================================================================
//  Project controller
//  - getProjects   : paginated list, supports ?keyword= and ?year= filters
//  - getProjectById: single project with supervisor details
//  - createProject : admin only
//  - updateProject : admin only
//  - deleteProject : admin only
//
//  Every query is parameterised to prevent SQL injection.
// =====================================================================
const pool = require('../config/db');

// Reusable SELECT that joins the supervisor name onto each project row.
const PROJECT_SELECT = `
  SELECT
    p.project_id,
    p.title,
    p.student_name,
    p.year_completed,
    p.abstract,
    p.project_link,
    p.supervisor_id,
    s.full_name AS supervisor_name,
    s.department AS supervisor_department,
    p.added_by,
    p.created_at
  FROM projects p
  JOIN supervisors s ON p.supervisor_id = s.supervisor_id
`;

// GET /api/projects?page=1&limit=9&keyword=...&year=...
const getProjects = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
    const offset = (page - 1) * limit;

    const keyword = (req.query.keyword || '').trim();
    const year = (req.query.year || '').trim();

    // Build WHERE clause dynamically but safely with placeholders.
    const where = [];
    const params = [];

    if (keyword) {
      where.push('(p.title LIKE ? OR p.student_name LIKE ? OR p.abstract LIKE ?)');
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }
    if (year) {
      where.push('p.year_completed = ?');
      params.push(parseInt(year, 10));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Total count for pagination metadata
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM projects p ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Page of results (newest first)
    const [rows] = await pool.query(
      `${PROJECT_SELECT} ${whereClause} ORDER BY p.year_completed DESC, p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('getProjects error:', err);
    return res.status(500).json({ message: 'Server error while fetching projects.' });
  }
};

// GET /api/projects/:id
const getProjectById = async (req, res) => {
  try {
    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.project_id = ?`, [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('getProjectById error:', err);
    return res.status(500).json({ message: 'Server error while fetching the project.' });
  }
};

// Shared validation for create/update payloads
const validateProjectBody = (body) => {
  const { title, student_name, year_completed, abstract, supervisor_id } = body;
  if (!title || !student_name || !year_completed || !abstract || !supervisor_id) {
    return 'Title, student name, year completed, abstract and supervisor are required.';
  }
  const yr = parseInt(year_completed, 10);
  if (Number.isNaN(yr) || yr < 1990 || yr > new Date().getFullYear() + 1) {
    return 'Please provide a valid year completed.';
  }
  return null;
};

// POST /api/projects   (admin only)
const createProject = async (req, res) => {
  try {
    const error = validateProjectBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const {
      title,
      student_name,
      year_completed,
      abstract,
      project_link,
      supervisor_id,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO projects
        (title, student_name, year_completed, abstract, project_link, supervisor_id, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        student_name,
        parseInt(year_completed, 10),
        abstract,
        project_link || null,
        supervisor_id,
        req.user.user_id, // taken from the JWT, not the client body
      ]
    );

    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.project_id = ?`, [
      result.insertId,
    ]);
    return res.status(201).json({ message: 'Project added successfully.', project: rows[0] });
  } catch (err) {
    console.error('createProject error:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'The selected supervisor does not exist.' });
    }
    return res.status(500).json({ message: 'Server error while creating the project.' });
  }
};

// PUT /api/projects/:id   (admin only)
const updateProject = async (req, res) => {
  try {
    const error = validateProjectBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const {
      title,
      student_name,
      year_completed,
      abstract,
      project_link,
      supervisor_id,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE projects SET
         title = ?, student_name = ?, year_completed = ?, abstract = ?,
         project_link = ?, supervisor_id = ?
       WHERE project_id = ?`,
      [
        title,
        student_name,
        parseInt(year_completed, 10),
        abstract,
        project_link || null,
        supervisor_id,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.project_id = ?`, [
      req.params.id,
    ]);
    return res.json({ message: 'Project updated successfully.', project: rows[0] });
  } catch (err) {
    console.error('updateProject error:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'The selected supervisor does not exist.' });
    }
    return res.status(500).json({ message: 'Server error while updating the project.' });
  }
};

// DELETE /api/projects/:id   (admin only)
const deleteProject = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM projects WHERE project_id = ?', [
      req.params.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    return res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('deleteProject error:', err);
    return res.status(500).json({ message: 'Server error while deleting the project.' });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
