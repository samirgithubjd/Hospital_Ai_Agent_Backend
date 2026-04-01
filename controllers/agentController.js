const vapiConfig = require('../config/vapi');
const Call = require('../models/Call');
const User = require('../models/User');

/**
 * Get current AI agent information
 */
const getCurrentAgent = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'AI Agent information retrieved',
      data: {
        name: 'Hospital AI Voice Agent',
        phoneNumber: vapiConfig.phoneNumber,
        areaCode: vapiConfig.areaCode,
        countryCode: vapiConfig.countryCode,
        location: vapiConfig.location,
        capabilities: [
          'Appointment Booking',
          'Symptom Collection',
          'Patient Information Gathering',
          'Emergency Detection',
          'Doctor Recommendation',
          'Call Recording & Transcription'
        ],
        status: 'active',
        configuration: {
          recordingEnabled: vapiConfig.callSettings.enableRecording,
          transcriptionEnabled: vapiConfig.callSettings.enableTranscription,
          maxCallDuration: vapiConfig.callSettings.maxDuration,
          timezone: vapiConfig.location.timezone,
          supportedLanguages: ['English']
        },
        webhookUrl: process.env.WEBHOOK_URL || 'https://your-domain/api/webhook/vapi',
        apiStatus: 'Connected',
        callsToday: 0, // Will be updated
        appointmentsBookedToday: 0 // Will be updated
      }
    });
  } catch (error) {
    console.error('Get Current Agent Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent information',
      error: error.message
    });
  }
};

/**
 * Get agent statistics and performance
 */
const getAgentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const totalCalls = await Call.countDocuments(filter);
    const aiCalls = await Call.countDocuments({
      ...filter,
      'vapiCallData.type': 'appointment-booking'
    });
    const successfulBookings = await Call.countDocuments({
      ...filter,
      appointmentBooked: true,
      'vapiCallData.type': 'appointment-booking'
    });
    const emergencyCalls = await Call.countDocuments({
      ...filter,
      isEmergency: true
    });
    const averageCallDuration = await Call.aggregate([
      { $match: filter },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    res.status(200).json({
      success: true,
      message: 'Agent statistics retrieved',
      data: {
        totalCalls,
        aiAppointmentBookingCalls: aiCalls,
        successfulAppointmentBookings: successfulBookings,
        bookingSuccessRate: aiCalls > 0 ? `${((successfulBookings / aiCalls) * 100).toFixed(2)}%` : '0%',
        emergencyCalls,
        averageCallDuration: averageCallDuration[0]?.avgDuration?.toFixed(2) || 0,
        agentStatus: 'Active',
        lastUpdate: new Date()
      }
    });
  } catch (error) {
    console.error('Get Agent Stats Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent statistics',
      error: error.message
    });
  }
};

/**
 * Get agent configuration
 */
const getAgentConfig = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Agent configuration retrieved',
      data: {
        apiKey: vapiConfig.apiKey ? '✓ Configured' : '✗ Missing',
        phoneNumber: vapiConfig.phoneNumber,
        baseUrl: vapiConfig.baseUrl,
        callSettings: vapiConfig.callSettings,
        webhookEndpoint: vapiConfig.webhook.endpoint,
        webhookEvents: vapiConfig.webhook.events,
        location: vapiConfig.location,
        headers: {
          Authorization: vapiConfig.headers.Authorization ? '✓ Configured' : '✗ Missing',
          'Content-Type': vapiConfig.headers['Content-Type']
        }
      }
    });
  } catch (error) {
    console.error('Get Agent Config Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve agent configuration',
      error: error.message
    });
  }
};

module.exports = {
  getCurrentAgent,
  getAgentStats,
  getAgentConfig
};
