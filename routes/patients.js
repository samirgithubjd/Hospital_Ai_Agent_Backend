const express = require('express');
const router = express.Router();
const { getAllPatients, getPatientById } = require('../controllers/patientController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/patients
router.get('/', authMiddleware, getAllPatients);

// GET /api/patients/:id
router.get('/:id', authMiddleware, getPatientById);

module.exports = router;
