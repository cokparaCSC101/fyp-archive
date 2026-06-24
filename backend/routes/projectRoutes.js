// Project routes
//   GET    /api/projects        -> any authenticated user (read)
//   GET    /api/projects/:id    -> any authenticated user (read)
//   POST   /api/projects        -> staff (admin/hod immediate; lecturer -> request)
//   PUT    /api/projects/:id    -> staff (admin/hod immediate; lecturer -> request)
//   DELETE /api/projects/:id    -> staff (admin/hod immediate; lecturer -> request)
const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { verifyToken, requireStaff } = require('../middleware/auth');

router.get('/', verifyToken, getProjects);
router.get('/:id', verifyToken, getProjectById);
router.post('/', verifyToken, requireStaff, createProject);
router.put('/:id', verifyToken, requireStaff, updateProject);
router.delete('/:id', verifyToken, requireStaff, deleteProject);

module.exports = router;
