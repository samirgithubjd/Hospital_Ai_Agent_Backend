const express = require('express');
const router = express.Router();
const {
  getAllCalls,
  getCallById,
  initiateCall,
  getCallStatus,
  handleIncomingCall,
  bookAppointmentFromCall,
  getCallDetails,
  updateCallWithAppointment,
  getCalls,
  initiateAIAppointmentBookingCall,
  processAIAppointmentBooking
} = require('../controllers/callController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// ============= AI APPOINTMENT BOOKING ROUTES =============

/**
 * @route   POST /api/calls/ai-booking/initiate
 * @desc    Initiate AI appointment booking call
 * @access  Authenticated (Patient/Admin)
 * @body    { patientId or phoneNumber, preferredDoctor, symptoms, isEmergency }
 */
router.post('/ai-booking/initiate', authMiddleware, initiateAIAppointmentBookingCall);

/**
 * @route   POST /api/calls/ai-booking/process
 * @desc    Process appointment booking from AI call (called by webhook)
 * @access  Public (VAPI Webhook)
 * @body    { callId, aiExtractedData }
 */
router.post('/ai-booking/process', processAIAppointmentBooking);

// ============= STANDARD CALL ROUTES =============

// GET /api/calls - Get calls with pagination
router.get('/', authMiddleware, getCalls);

// POST /api/calls/initiate - Initiate a new VAPI call
router.post('/initiate', authMiddleware, initiateCall);

// POST /api/calls/webhook/incoming - Handle incoming call from VAPI (webhook)
router.post('/webhook/incoming', handleIncomingCall);

// ============= SPECIFIC ROUTES (BEFORE DYNAMIC :id) =============

// GET /api/calls/:id/status - Get call status
router.get('/:id/status', authMiddleware, getCallStatus);

// GET /api/calls/:id/details - Get detailed call information
router.get('/:id/details', authMiddleware, getCallDetails);

// POST /api/calls/:callId/book-appointment - Book appointment from a call
router.post('/:callId/book-appointment', authMiddleware, roleMiddleware('doctor', 'admin'), bookAppointmentFromCall);

// PUT /api/calls/:id/appointment - Update call with appointment information
router.put('/:id/appointment', authMiddleware, roleMiddleware('doctor', 'admin'), updateCallWithAppointment);

// ============= DYNAMIC ROUTES (MUST BE LAST) =============

// GET /api/calls/:id - Get call by ID
router.get('/:id', authMiddleware, getCallById);

module.exports = router;
