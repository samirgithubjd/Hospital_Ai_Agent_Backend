// EXAMPLE: Role-Based Route Implementation
// This file shows how to use the new role-based authentication in your routes

const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// ============================================
// ADMIN-ONLY ROUTES
// ============================================

// Get all users in the system
router.get('/admin/users', 
  authMiddleware, 
  roleMiddleware('admin'),
  async (req, res) => {
    // Only accessible to admins
    // req.userId and req.userRole are available
    res.json({
      message: 'This endpoint is admin-only',
      adminId: req.userId,
      role: req.userRole
    });
  }
);

// Approve a doctor registration
router.put('/admin/doctors/:id/approve', 
  authMiddleware, 
  roleMiddleware('admin'),
  async (req, res) => {
    // Only admins can approve doctors
    const doctorId = req.params.id;
    
    res.json({
      message: 'Doctor approved (implement actual logic)',
      doctorId: doctorId,
      approvedBy: req.userId
    });
  }
);

// Deactivate a doctor account
router.put('/admin/doctors/:id/deactivate', 
  authMiddleware, 
  roleMiddleware('admin'),
  async (req, res) => {
    // Only admins can deactivate doctors
    const doctorId = req.params.id;
    
    res.json({
      message: 'Doctor deactivated',
      doctorId: doctorId,
      deactivatedBy: req.userId
    });
  }
);

// ============================================
// DOCTOR-ONLY ROUTES
// ============================================

// Doctors can access patients
router.get('/doctors/patients', 
  authMiddleware, 
  roleMiddleware('doctor'),
  async (req, res) => {
    // Only accessible to doctors
    res.json({
      message: 'Retrieving patient list',
      doctorId: req.userId,
      role: req.userRole
    });
  }
);

// Doctors can update patient notes
router.put('/doctors/patients/:id/notes', 
  authMiddleware, 
  roleMiddleware('doctor'),
  async (req, res) => {
    // Only doctors can update patient notes
    const patientId = req.params.id;
    
    res.json({
      message: 'Patient notes updated',
      patientId: patientId,
      updatedBy: req.userId
    });
  }
);

// ============================================
// ADMIN + DOCTOR ROUTES
// ============================================

// Both admins and doctors can view patients
router.get('/shared/patients', 
  authMiddleware, 
  roleMiddleware('admin', 'doctor'),
  async (req, res) => {
    // Accessible to both admins and doctors
    res.json({
      message: 'Patient data (admin and doctor access)',
      accessedBy: req.userId,
      role: req.userRole
    });
  }
);

// Both admins and doctors can view appointments
router.get('/shared/appointments', 
  authMiddleware, 
  roleMiddleware('admin', 'doctor'),
  async (req, res) => {
    // Both roles can access
    res.json({
      message: 'Appointment data',
      accessedBy: req.userId,
      role: req.userRole
    });
  }
);

// ============================================
// PATIENT-ONLY ROUTES
// ============================================

// Patients can view their own appointments
router.get('/patients/my-appointments', 
  authMiddleware, 
  roleMiddleware('patient'),
  async (req, res) => {
    // Only patients can access their appointments
    res.json({
      message: 'Your appointments',
      patientId: req.userId
    });
  }
);

// Patients can update their profile
router.put('/patients/profile', 
  authMiddleware, 
  roleMiddleware('patient'),
  async (req, res) => {
    // Only patients can update their profile
    res.json({
      message: 'Profile updated',
      patientId: req.userId,
      updates: req.body
    });
  }
);

// ============================================
// AUTHENTICATED USER ROUTES (All roles)
// ============================================

// All authenticated users can get their own profile
router.get('/profile', 
  authMiddleware,
  async (req, res) => {
    // No roleMiddleware - all roles can access
    res.json({
      message: 'Your profile',
      userId: req.userId,
      role: req.userRole,
      fullUser: req.user
    });
  }
);

// All authenticated users can change their password
router.put('/change-password', 
  authMiddleware,
  async (req, res) => {
    // All authenticated users can access
    res.json({
      message: 'Password change initiated',
      userId: req.userId,
      role: req.userRole
    });
  }
);

module.exports = router;
