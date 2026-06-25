const express = require('express');
const router = express.Router();
const { verifyToken, requireApprover } = require('../middleware/auth');
const { listAudit } = require('../controllers/auditController');

router.get('/', verifyToken, requireApprover, listAudit); // admin + hod

module.exports = router;
