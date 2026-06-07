// Supervisor routes
const express = require('express');
const router = express.Router();
const { getSupervisors } = require('../controllers/supervisorController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, getSupervisors);

module.exports = router;
