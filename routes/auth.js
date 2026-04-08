const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');

/**
 * @route   POST /api/auth/login
 * @desc    Login with email/phone + password + optional role
 * @body    { email or contact: "email or phone", password: "string", role?: "patient|doctor|admin" }
 * @example Option 1 - Using email:
 * {
 *   "email": "john@example.com",
 *   "password": "password123",
 *   "role": "patient"
 * }
 * @example Option 2 - Using contact:
 * {
 *   "contact": "9876543210",
 *   "password": "password123",
 *   "role": "patient"
 * }
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user (patient, doctor, or admin)
 * @body    { email, username, password, confirmPassword, firstName, lastName, phone, role?, age?, medicalHistory? }
 * @example
 * {
 *   "email": "john@example.com",
 *   "username": "john123",
 *   "password": "password123",
 *   "confirmPassword": "password123",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "phone": "9876543210",
 *   "role": "patient",
 *   "age": 30,
 *   "medicalHistory": "None"
 * }
 */
router.post('/register', register);

module.exports = router;
