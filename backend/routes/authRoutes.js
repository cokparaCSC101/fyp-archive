// Auth routes: register, verify email, resend code, login
const express = require('express');
const router = express.Router();
const { register, verifyEmail, resendCode, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendCode);
router.post('/login', login);

module.exports = router;
