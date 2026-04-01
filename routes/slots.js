const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  addSlots,
  getAvailableSlots,
  getAllAvailableSlotsForDate,
  blockSlot,
  unblockSlot,
  deleteSlot,
  getDoctorSlots,
  getSlotById,
  updateSlot,
  getAllDoctorSlots,
  getAllSlots,
  deleteMultipleSlots,
  bulkUpdateSlots,
  checkSlotAvailability
} = require('../controllers/slotController');

// ============= ADMIN PANEL ROUTES (Admin Only) - MUST BE FIRST =============

/**
 * @route   GET /api/slots/admin/all
 * @desc    Get all slots for all doctors (Admin only)
 * @access  Admin
 * @query   { startDate, endDate, doctorId, isAvailable, page, limit }
 */
router.get('/admin/all', authMiddleware, roleMiddleware('admin'), getAllSlots);

/**
 * @route   GET /api/slots/admin/doctor/:doctorId
 * @desc    Get all slots for a specific doctor (Admin only)
 * @access  Admin
 * @params  { doctorId }
 * @query   { startDate, endDate, isAvailable, page, limit }
 */
router.get('/admin/doctor/:doctorId', authMiddleware, roleMiddleware('admin'), getAllDoctorSlots);

/**
 * @route   DELETE /api/slots/admin/bulk-delete
 * @desc    Delete multiple slots at once (Admin only)
 * @access  Admin
 * @body    { slotIds: [id1, id2, ...] }
 */
router.delete('/admin/bulk-delete', authMiddleware, roleMiddleware('admin'), deleteMultipleSlots);

/**
 * @route   PUT /api/slots/admin/bulk-update
 * @desc    Update multiple slots at once (Admin only)
 * @access  Admin
 * @body    { slotIds: [id1, id2, ...], location, fee, isAvailable }
 */
router.put('/admin/bulk-update', authMiddleware, roleMiddleware('admin'), bulkUpdateSlots);

// ============= PUBLIC ROUTES (Authenticated Users) =============

/**
 * @route   GET /api/doctors/:doctorId/available-slots?date=YYYY-MM-DD
 * @desc    Get available slots for a specific doctor on a specific date
 * @access  Authenticated Users (Patients, Doctors, Admins)
 * @params  { doctorId }
 * @query   { date }
 */
router.get('/doctors/:doctorId/available-slots', authMiddleware, getAvailableSlots);

/**
 * @route   GET /api/slots/available?date=YYYY-MM-DD
 * @desc    Get all available slots for all doctors on a specific date
 * @access  Authenticated Users (Patients, Doctors, Admins)
 * @query   { date }
 */
router.get('/available', authMiddleware, getAllAvailableSlotsForDate);

/**
 * @route   POST /api/slots/check-availability
 * @desc    Check if a specific slot is available (used by AI agent)
 * @access  Authenticated (AI Agent/System)
 * @body    { doctorId, date, time, duration }
 */
router.post('/check-availability', authMiddleware, checkSlotAvailability);

// ============= DOCTOR ROUTES (Doctor/Admin Only) =============

/**
 * @route   POST /api/slots/doctor/:doctorId/add
 * @desc    Add available slots for a doctor (Doctor/Admin only)
 * @access  Doctor/Admin
 * @params  { doctorId }
 * @body    { date, startTime, endTime, slotDuration, location, fee, isRecurring, recurringPattern, recurringEndDate }
 */
router.post('/doctor/:doctorId/add', authMiddleware, roleMiddleware('doctor', 'admin'), addSlots);

/**
 * @route   GET /api/slots/doctor/:doctorId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @desc    Get all slots for a doctor in a date range (Doctor/Admin only)
 * @access  Doctor/Admin
 * @params  { doctorId }
 * @query   { startDate, endDate }
 */
router.get('/doctor/:doctorId', authMiddleware, roleMiddleware('doctor', 'admin'), getDoctorSlots);

// ============= SLOT BY ID ROUTES (MUST BE AFTER SPECIFIC ROUTES) =============

/**
 * @route   GET /api/slots/:slotId
 * @desc    Get specific slot details
 * @access  Authenticated Users
 * @params  { slotId }
 */
router.get('/:slotId', authMiddleware, getSlotById);

/**
 * @route   PUT /api/slots/:slotId/block
 * @desc    Block a time slot (Doctor/Admin only)
 * @access  Doctor/Admin
 * @params  { slotId }
 * @body    { reason }
 */
router.put('/:slotId/block', authMiddleware, roleMiddleware('doctor', 'admin'), blockSlot);

/**
 * @route   PUT /api/slots/:slotId/unblock
 * @desc    Unblock a time slot (Doctor/Admin only)
 * @access  Doctor/Admin
 * @params  { slotId }
 */
router.put('/:slotId/unblock', authMiddleware, roleMiddleware('doctor', 'admin'), unblockSlot);

/**
 * @route   PUT /api/slots/:slotId/edit
 * @desc    Update slot details (Doctor/Admin only)
 * @access  Doctor/Admin
 * @params  { slotId }
 * @body    { startTime, endTime, slotDuration, location, fee, isAvailable }
 */
router.put('/:slotId/edit', authMiddleware, roleMiddleware('doctor', 'admin'), updateSlot);

/**
 * @route   DELETE /api/slots/:slotId
 * @desc    Delete a time slot (Doctor/Admin only)
 * @access  Doctor/Admin
 * @params  { slotId }
 */
router.delete('/:slotId', authMiddleware, roleMiddleware('doctor', 'admin'), deleteSlot);

module.exports = router;
