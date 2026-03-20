const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAllAppointments,
  getDoctorAppointments,
  getPatientAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAppointments,
  getDashboardStats
} = require('../controllers/appointmentController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Public endpoints
// GET /api/appointments - Get all (kept for backward compatibility)
router.get('/', authMiddleware, getAppointments);

// Admin dashboard
// GET /api/appointments/admin/stats
router.get('/admin/stats', authMiddleware, roleMiddleware('admin'), getDashboardStats);

// GET /api/appointments/admin/all - Get all appointments (admin only)
router.get('/admin/all', authMiddleware, roleMiddleware('admin'), getAllAppointments);

// Doctor routes
// GET /api/appointments/doctor/my-appointments - Get doctor's appointments
router.get('/doctor/my-appointments', authMiddleware, roleMiddleware('doctor'), getDoctorAppointments);

// GET /api/appointments/doctor/stats - Doctor dashboard stats
router.get('/doctor/stats', authMiddleware, roleMiddleware('doctor'), getDashboardStats);

// Patient routes
// POST /api/appointments/patient/book - Book new appointment (patient only)
router.post('/patient/book', authMiddleware, roleMiddleware('patient'), createAppointment);

// GET /api/appointments/patient/my-appointments - Get patient's appointments
router.get('/patient/my-appointments', authMiddleware, roleMiddleware('patient'), getPatientAppointments);

// GET /api/appointments/patient/stats - Patient dashboard stats
router.get('/patient/stats', authMiddleware, roleMiddleware('patient'), getDashboardStats);

// GET /api/appointments/:id - Get appointment details
router.get('/:id', authMiddleware, getAppointmentById);

// PUT /api/appointments/:id - Update appointment (doctor/admin)
router.put('/:id', authMiddleware, roleMiddleware('doctor', 'admin'), updateAppointment);

// PUT /api/appointments/:id/cancel - Cancel appointment
router.put('/:id/cancel', authMiddleware, cancelAppointment);

// PUT /api/appointments/:id/reschedule - Reschedule appointment
router.put('/:id/reschedule', authMiddleware, rescheduleAppointment);

module.exports = router;
