const express = require('express');
const router = express.Router();
const { handleVapiWebhook, handleAIAppointmentBookingWebhook } = require('../controllers/webhookController');

// POST /api/webhook/vapi
// This route is NOT protected - Vapi needs to call it directly
router.post('/vapi', handleVapiWebhook);

// POST /api/webhook/vapi/ai-booking
// Webhook for AI appointment booking calls - NOT protected for VAPI callback
router.post('/vapi/ai-booking', handleAIAppointmentBookingWebhook);

module.exports = router;
