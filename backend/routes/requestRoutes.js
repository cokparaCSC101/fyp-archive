// Approval-workflow routes
//   GET  /api/requests          -> admin/hod: list pending (or all) requests
//   GET  /api/requests/mine     -> staff: the caller's own requests
//   POST /api/requests/:id/approve -> admin/hod
//   POST /api/requests/:id/deny    -> admin/hod
const express = require('express');
const router = express.Router();
const { verifyToken, requireApprover, requireStaff } = require('../middleware/auth');
const { listRequests, myRequests, approveRequest, denyRequest } = require('../controllers/requestController');

router.get('/', verifyToken, requireApprover, listRequests);
router.get('/mine', verifyToken, requireStaff, myRequests);
router.post('/:id/approve', verifyToken, requireApprover, approveRequest);
router.post('/:id/deny', verifyToken, requireApprover, denyRequest);

module.exports = router;
