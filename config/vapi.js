/**
 * VAPI Configuration
 * Handles all VAPI-related settings and constants
 */

const vapiConfig = {
  // VAPI API Details
  apiKey: process.env.VAPI_API_KEY,
  baseUrl: process.env.VAPI_BASE_URL || 'https://api.vapi.ai',

  // Phone Number Details
  phoneNumber: process.env.VAPI_PHONE_NUMBER || '+1-914-465-1284',
  areaCode: process.env.VAPI_AREA_CODE || '914',
  countryCode: '+1',
  
  // Location Information (914 Area Code - Westchester County, New York)
  location: {
    areaCode: '914',
    region: 'Westchester County',
    state: 'New York',
    timezone: 'America/New_York',
    country: 'United States'
  },

  // Call Configuration
  callSettings: {
    enableRecording: true,
    enableTranscription: true,
    timeout: 60, // seconds
    maxDuration: 1800, // 30 minutes
    retryAttempts: 3,
    retryDelay: 5000 // milliseconds
  },

  // Webhook Configuration
  webhook: {
    endpoint: process.env.WEBHOOK_URL || 'https://remigial-jace-antecedently.ngrok-free.dev/api/webhook/vapi',
    events: ['call-started', 'call-ended', 'message-received']
  },

  // Headers for API requests
  headers: {
    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json'
  },

  // Validate configuration
  validate: function() {
    if (!this.apiKey) {
      throw new Error('VAPI_API_KEY is not configured in environment variables');
    }
    if (!this.phoneNumber) {
      throw new Error('VAPI_PHONE_NUMBER is not configured in environment variables');
    }
    console.log(`✓ VAPI Configured: ${this.phoneNumber} (Area Code: ${this.areaCode})`);
    return true;
  }
};

module.exports = vapiConfig;
