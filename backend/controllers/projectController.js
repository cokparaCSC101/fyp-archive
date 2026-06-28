// =====================================================================
//  Project controller
//  Read (any authenticated user):
//    - getProjects    : paginated list, ?keyword= and ?year= filters
//    - getProjectById : single project with supervisor details
//
//  Write (role-aware; route restricts to admin/hod/lecturer):
//    - admin / hod : the action is applied to the archive immediately.
//    - lecturer    : the action is saved to project_requests as a
//                    PENDING request for the HoD to approve or deny.
//
//  Every query is parameterised to prevent SQL injection.
// =====================================================================
const pool = require('../config/db');
const { logAudit } = require('../utils/audit');
const { compareProject } = require('../utils/similarity');

const PROJECT_SELECT = `
  SELECT
    p.project_id,
    p.title,
    p.student_name,
    p.year_completed,
    p.abstract,
    p.project_link,
    p.project_webapp_link,
    p.supervisor_id,
    s.full_name AS supervisor_name,
    s.department AS supervisor_department,
    p.added_by,
    p.created_at
  FROM projects p
  JOIN supervisors s ON p.supervisor_id = s.supervisor_id
`;

const canActDirectly = (role) => role === 'admin' || role === 'hod';

// GET /api/projects?page=1&limit=9&keyword=...&year=...
const getProjects = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
    const offset = (page - 1) * limit;

    const keyword = (req.query.keyword || '').trim();
    const year = (req.query.year || '').trim();

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

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM projects p ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `${PROJECT_SELECT} ${whereClause} ORDER BY p.year_completed DESC, p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error('getProjects error:', err);
    return res.status(500).json({ message: 'Server error while fetching projects.' });
  }
};

// GET /api/projects/:id
const getProjectById = async (req, res) => {
  try {
    const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.project_id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    logAudit({ user_id: req.user.user_id, action: 'view_project', project_id: rows[0].project_id, details: rows[0].title });
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

const fields = (b) => ({
  title: b.title,
  student_name: b.student_name,
  year_completed: parseInt(b.year_completed, 10),
  abstract: b.abstract,
  project_link: b.project_link || null,
  project_webapp_link: b.project_webapp_link || null,
  supervisor_id: b.supervisor_id,
});

// POST /api/projects   (admin/hod -> immediate; lecturer -> pending request)
const createProject = async (req, res) => {
  try {
    const error = validateProjectBody(req.body);
    if (error) return res.status(400).json({ message: error });
    const f = fields(req.body);

    if (canActDirectly(req.user.role)) {
      const [result] = await pool.query(
        `INSERT INTO projects
           (title, student_name, year_completed, abstract, project_link, project_webapp_link, supervisor_id, added_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.title, f.student_name, f.year_completed, f.abstract, f.project_link, f.project_webapp_link, f.supervisor_id, req.user.user_id]
      );
      await logAudit({ user_id: req.user.user_id, action: 'create_project', project_id: result.insertId, details: f.title });
      const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.project_id = ?`, [result.insertId]);
      return res.status(201).json({ message: 'Project added successfully.', project: rows[0] });
    }

    // lecturer -> queue a create request (with a similarity check vs the archive)
    const [allProj] = await pool.query('SELECT project_id, title, abstract FROM projects');
    const sim = compareProject({ title: f.title, abstract: f.abstract }, allProj);
    const [r] = await pool.query(
      `INSERT INTO project_requests
         (action, title, student_name, year_completed, abstract, project_link, project_webapp_link, supervisor_id, similarity_score, similarity_info, requested_by)
       VALUES ('create', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [f.title, f.student_name, f.year_completed, f.abstract, f.project_link, f.project_webapp_link, f.supervisor_id, sim.score, JSON.stringify(sim.matches), req.user.user_id]
    );
    await logAudit({ user_id: req.user.user_id, action: 'request_create', details: f.title });
    return res.status(202).json({
      message: 'Your project has been submitted to the HoD for approval.',
      pending: true,
      request_id: r.insertId,
    });
  } catch (err) {
    console.error('createProject error:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'The selected supervisor does not exist.' });
    }
    return res.status(500).json({ message: 'Server error while creating the project.' });
  }
};

// PUT /api/projects/:id   (admin/hod -> immediate; lecturer -> pending request)
const updateProject = async (req, res) => {
  try {
    const error = validateProjectBody(req.body);
    if (error) return res.status(400).json({ message: error });
    const f = fields(req.body);
    const id = req.params.id;

    if (canActDirectly(req.user.role)) {
      const [result] = await pool.query(
        `UPDATE projects SET
           title = ?, student_name = ?, year_completed = ?, abstract = ?,
           project_link = ?, project_webapp_link = ?, supervisor_id = ?
         WHERE project_id = ?`,
        [f.title, f.student_name, f.year_completed, f.abstract, f.project_link, f.project_webapp_link, f.supervisor_id, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Project not found.' });
      await logAudit({ user_id: req.user.user_id, action: 'update_project', project_id: id, details: f.title });
      const [rows] = await pool.query(`${PROJECT_SELECT} WHERE p.project_id = ?`, [id]);
      return res.json({ message: 'Project updated successfully.', project: rows[0] });
    }

    // lecturer -> queue an update request (confirm the target exists first)
    const [exists] = await pool.query('SELECT project_id FROM projects WHERE project_id = ?', [id]);
    if (exists.length === 0) return res.status(404).json({ message: 'Project not found.' });

    const [allProj] = await pool.query('SELECT project_id, title, abstract FROM projects WHERE project_id <> ?', [id]);
    const sim = compareProject({ title: f.title, abstract: f.abstract }, allProj);
    const [r] = await pool.query(
      `INSERT INTO project_requests
         (action, target_project_id, title, student_name, year_completed, abstract, project_link, project_webapp_link, supervisor_id, similarity_score, similarity_info, requested_by)
       VALUES ('update', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, f.title, f.student_name, f.year_completed, f.abstract, f.project_link, f.project_webapp_link, f.supervisor_id, sim.score, JSON.stringify(sim.matches), req.user.user_id]
    );
    await logAudit({ user_id: req.user.user_id, action: 'request_update', project_id: id, details: f.title });
    return res.status(202).json({
      message: 'Your edit has been submitted to the HoD for approval.',
      pending: true,
      request_id: r.insertId,
    });
  } catch (err) {
    console.error('updateProject error:', err);
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'The selected supervisor does not exist.' });
    }
    return res.status(500).json({ message: 'Server error while updating the project.' });
  }
};

// DELETE /api/projects/:id   (admin/hod -> immediate; lecturer -> pending request)
const deleteProject = async (req, res) => {
  try {
    const id = req.params.id;

    if (canActDirectly(req.user.role)) {
      // Read the title BEFORE deleting so the audit log can show the name.
      const [existing] = await pool.query('SELECT title FROM projects WHERE project_id = ?', [id]);
      if (existing.length === 0) return res.status(404).json({ message: 'Project not found.' });
      await pool.query('DELETE FROM projects WHERE project_id = ?', [id]);
      await logAudit({ user_id: req.user.user_id, action: 'delete_project', project_id: null, details: existing[0].title });
      return res.json({ message: 'Project deleted successfully.' });
    }

    // lecturer -> queue a delete request
    const [rows] = await pool.query('SELECT project_id, title FROM projects WHERE project_id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Project not found.' });

    const [r] = await pool.query(
      `INSERT INTO project_requests (action, target_project_id, title, requested_by)
       VALUES ('delete', ?, ?, ?)`,
      [id, rows[0].title, req.user.user_id]
    );
    await logAudit({ user_id: req.user.user_id, action: 'request_delete', project_id: id, details: rows[0].title });
    return res.status(202).json({
      message: 'Your delete request has been submitted to the HoD for approval.',
      pending: true,
      request_id: r.insertId,
    });
  } catch (err) {
    console.error('deleteProject error:', err);
    return res.status(500).json({ message: 'Server error while deleting the project.' });
  }
};

// On-demand similarity check for direct uploaders (admin/HoD) — compares a
// draft title+abstract against the archive without saving anything.
const checkSimilarity = async (req, res) => {
  try {
    const { title, abstract, project_id } = req.body;
    if (!title && !abstract) {
      return res.status(400).json({ message: 'Enter a title and abstract first.' });
    }
    let rows;
    if (project_id) {
      [rows] = await pool.query('SELECT project_id, title, abstract FROM projects WHERE project_id <> ?', [project_id]);
    } else {
      [rows] = await pool.query('SELECT project_id, title, abstract FROM projects');
    }
    const sim = compareProject({ title: title || '', abstract: abstract || '' }, rows);
    return res.json(sim); // { score, matches }
  } catch (err) {
    console.error('checkSimilarity error:', err);
    return res.status(500).json({ message: 'Server error during the similarity check.' });
  }
};

module.exports = {
  checkSimilarity, getProjects, getProjectById, createProject, updateProject, deleteProject };
