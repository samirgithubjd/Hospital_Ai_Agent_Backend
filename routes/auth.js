const express = require('express');
const router = express.Router();
const { login, register, verifyEmail, resendVerificationEmail } = require('../controllers/authController');

// POST /api/auth/login - Login with email or phone + password
router.post('/login', login);

// POST /api/auth/register - Register new patient (phone required)
router.post('/register', register);

// POST /api/auth/verify-email - Verify email with token
router.post('/verify-email', verifyEmail);

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', resendVerificationEmail);

module.exports = router;
