// Project routes
//   GET    /api/projects        -> any authenticated user (read)
//   GET    /api/projects/:id    -> any authenticated user (read)
//   POST   /api/projects        -> admin only (create)
//   PUT    /api/projects/:id    -> admin only (update)
//   DELETE /api/projects/:id    -> admin only (delete)
const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, getProjects);
router.get('/:id', verifyToken, getProjectById);
router.post('/', verifyToken, requireAdmin, createProject);
router.put('/:id', verifyToken, requireAdmin, updateProject);
router.delete('/:id', verifyToken, requireAdmin, deleteProject);

module.exports = router;
