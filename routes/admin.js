const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  createAdmin,
  createDoctor,
  getAllAdmins,
  getAllDoctors,
  getPendingDoctors,
  approveDoctor,
  deactivateDoctor,
  updateDoctor,
  getAllPatients,
  getUserById,
  getSystemStats
} = require('../controllers/adminController');

/**
 * All routes require authentication and admin role
 */
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// ============= ADMIN ACCOUNT MANAGEMENT =============

/**
 * @route   POST /api/admin/create-admin
 * @desc    Create a new admin account (Admin only)
 * @access  Admin
 * @body    { email, password, firstName, lastName, phone }
 */
router.post('/create-admin', createAdmin);

/**
 * @route   GET /api/admin/all-admins
 * @desc    Get all admin accounts (Admin only)
 * @access  Admin
 * @query   { page, limit }
 */
router.get('/all-admins', getAllAdmins);

// ============= DOCTOR ACCOUNT MANAGEMENT =============

/**
 * @route   POST /api/admin/create-doctor
 * @desc    Create a new doctor account (Admin only)
 * @access  Admin
 * @body    { email, password, firstName, lastName, phone, specialization, department, licenseNumber }
 */
router.post('/create-doctor', createDoctor);

/**
 * @route   GET /api/admin/all-doctors
 * @desc    Get all doctors (Admin only)
 * @access  Admin
 * @query   { page, limit, isActive, specialization }
 */
router.get('/all-doctors', getAllDoctors);

/**
 * @route   GET /api/admin/doctors/pending
 * @desc    Get pending doctor approvals (Admin only)
 * @access  Admin
 */
router.get('/doctors/pending', getPendingDoctors);

/**
 * @route   PUT /api/admin/doctors/:doctorId/approve
 * @desc    Approve a doctor account (Admin only)
 * @access  Admin
 * @params  { doctorId }
 */
router.put('/doctors/:doctorId/approve', approveDoctor);

/**
 * @route   PUT /api/admin/doctors/:doctorId/deactivate
 * @desc    Deactivate a doctor account (Admin only)
 * @access  Admin
 * @params  { doctorId }
 * @body    { reason }
 */
router.put('/doctors/:doctorId/deactivate', deactivateDoctor);

/**
 * @route   PUT /api/admin/doctors/:doctorId/update
 * @desc    Update doctor information (Admin only)
 * @access  Admin
 * @params  { doctorId }
 * @body    { specialization, department, phone }
 */
router.put('/doctors/:doctorId/update', updateDoctor);

// ============= PATIENT MANAGEMENT =============

/**
 * @route   GET /api/admin/all-patients
 * @desc    Get all patients (Admin only)
 * @access  Admin
 * @query   { page, limit }
 */
router.get('/all-patients', getAllPatients);

// ============= USER MANAGEMENT =============

/**
 * @route   GET /api/admin/user/:userId
 * @desc    Get user by ID (Admin only)
 * @access  Admin
 * @params  { userId }
 */
router.get('/user/:userId', getUserById);

// ============= SYSTEM STATISTICS =============

/**
 * @route   GET /api/admin/statistics
 * @desc    Get system statistics (Admin only)
 * @access  Admin
 */
router.get('/statistics', getSystemStats);

module.exports = router;
