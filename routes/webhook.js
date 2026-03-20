const express = require('express');
const router = express.Router();
const { handleVapiWebhook } = require('../controllers/webhookController');

// POST /api/webhook/vapi
// This route is NOT protected - Vapi needs to call it directly
router.post('/vapi', handleVapiWebhook);

module.exports = router;
