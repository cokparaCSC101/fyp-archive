const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { createComplaint, myComplaints, listComplaints, updateComplaint } = require('../controllers/complaintController');

router.post('/', verifyToken, createComplaint);          // any authenticated user
router.get('/mine', verifyToken, myComplaints);          // any authenticated user
router.get('/', verifyToken, requireAdmin, listComplaints);     // admin only
router.put('/:id', verifyToken, requireAdmin, updateComplaint); // admin only

module.exports = router;
