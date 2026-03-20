const axios = require('axios');
const Call = require('../models/Call');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Patient = require('../models/Patient');
const vapiConfig = require('../config/vapi');

const getAllCalls = async (req, res) => {
  try {
    const calls = await Call.find()
      .populate('patientId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Calls retrieved successfully',
      data: calls
    });
  } catch (error) {
    console.error('Get Calls Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve calls',
      error: error.message
    });
  }
};

const getCallById = async (req, res) => {
  try {
    const { id } = req.params;

    const call = await Call.findById(id).populate('patientId');
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Call retrieved successfully',
      data: call
    });
  } catch (error) {
    console.error('Get Call Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve call',
      error: error.message
    });
  }
};

/**
 * Initiate a VAPI call to a patient
 * POST /api/calls/initiate
 */
const initiateCall = async (req, res) => {
  try {
    // Validate request body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'Request body is missing',
        details: 'Make sure Content-Type is set to application/json'
      });
    }

    const { patientId, phoneNumber, message } = req.body;

    // Validation
    if (!phoneNumber && !patientId) {
      return res.status(400).json({
        success: false,
        message: 'Either phoneNumber or patientId is required',
        example: {
          phoneNumber: '+1-914-555-1234',
          message: 'Hello from Hospital AI'
        }
      });
    }

    let patient = null;
    let targetPhone = phoneNumber;

    // If patientId provided, get patient details
    if (patientId) {
      patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
      targetPhone = patient.phone;
    }

    // Validate phone number
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number is required'
      });
    }

    // Prepare VAPI call payload
    const callPayload = {
      phoneNumber: targetPhone,
      fromNumber: vapiConfig.phoneNumber,
      message: message || 'Hello, this is a call from Hospital AI Voice Agent. Please provide your information.',
      recordingEnabled: vapiConfig.callSettings.enableRecording,
      transcriptionEnabled: vapiConfig.callSettings.enableTranscription,
      maxDuration: vapiConfig.callSettings.maxDuration
    };

    // Make VAPI API call
    const response = await axios.post(
      `${vapiConfig.baseUrl}/call`,
      callPayload,
      {
        headers: vapiConfig.headers
      }
    );

    // Create call record in database
    const call = new Call({
      patientId: patient ? patient._id : null,
      phoneNumber: targetPhone,
      status: 'initiated',
      vapiCallId: response.data.id,
      createdAt: new Date()
    });

    await call.save();

    res.status(201).json({
      success: true,
      message: 'Call initiated successfully',
      data: {
        callId: call._id,
        vapiCallId: response.data.id,
        phoneNumber: targetPhone,
        fromNumber: vapiConfig.phoneNumber,
        areaCode: vapiConfig.areaCode,
        status: 'initiated'
      }
    });
  } catch (error) {
    console.error('Initiate Call Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate call',
      error: error.message,
      details: error.response?.data || 'Check server logs for details'
    });
  }
};

/**
 * Get call status from VAPI
 * GET /api/calls/:id/status
 */
const getCallStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const call = await Call.findById(id);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // If VAPI call ID exists, fetch status from VAPI
    if (call.vapiCallId) {
      try {
        const response = await axios.get(
          `${vapiConfig.baseUrl}/call/${call.vapiCallId}`,
          {
            headers: vapiConfig.headers
          }
        );

        return res.status(200).json({
          success: true,
          message: 'Call status retrieved',
          data: {
            callId: call._id,
            vapiStatus: response.data.status,
            dbStatus: call.status,
            duration: call.duration,
            transcript: call.transcript,
            recordingUrl: call.recordingUrl
          }
        });
      } catch (vapiError) {
        console.error('VAPI Status Check Error:', vapiError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Call retrieved',
      data: {
        callId: call._id,
        status: call.status,
        duration: call.duration,
        phoneNumber: call.phoneNumber,
        transcript: call.transcript,
        recordingUrl: call.recordingUrl
      }
    });
  } catch (error) {
    console.error('Get Call Status Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get call status',
      error: error.message
    });
  }
};

/**
 * Handle incoming call from VAPI webhook
 * POST /api/calls/webhook/incoming
 */
const handleIncomingCall = async (req, res) => {
  try {
    const { phoneNumber, message, callId, patientName, symptoms, vapiCallData } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Try to find existing patient by phone
    let patient = await User.findOne({ phone: phoneNumber, role: 'patient' });

    // Create or update call record
    const call = new Call({
      patientId: patient ? patient._id : null,
      phoneNumber,
      patientName: patientName || 'Unknown',
      callStatus: 'connected',
      callType: 'inbound',
      symptoms,
      startTime: new Date(),
      vapiCallData,
      vapiCallId: callId,
      notes: message
    });

    await call.save();

    // Populate patient details if exists
    if (patient) {
      await call.populate('patientId', 'firstName lastName email phone username');
    }

    res.status(201).json({
      success: true,
      message: 'Incoming call recorded',
      data: {
        callId: call._id,
        patientId: patient ? patient._id : null,
        phoneNumber,
        patientName,
        status: 'connected',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Handle Incoming Call Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to handle incoming call',
      error: error.message
    });
  }
};

/**
 * Book appointment from a call
 * POST /api/calls/:callId/book-appointment
 */
const bookAppointmentFromCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { patientId, doctorId, appointmentDate, appointmentTime, symptoms, diagnosis } = req.body;

    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, Doctor ID, appointment date, and time are required'
      });
    }

    // Get the call
    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify doctor exists and is active
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor' || !doctor.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Doctor not found or not available'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      patientId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      symptoms: symptoms || call.symptoms,
      diagnosis,
      callId: call._id,
      status: 'scheduled',
      priority: call.isEmergency ? 'urgent' : 'medium'
    });

    await appointment.save();

    // Update call with appointment info
    call.appointmentBooked = true;
    call.appointmentId = appointment._id;
    call.callStatus = 'completed';
    call.endTime = new Date();
    await call.save();

    // Populate appointment details
    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName email phone username' },
      { path: 'doctorId', select: 'firstName lastName specialization department' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully from call',
      data: {
        appointment,
        call: {
          callId: call._id,
          appointmentBooked: true,
          status: 'completed'
        }
      }
    });
  } catch (error) {
    console.error('Book Appointment From Call Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message
    });
  }
};

/**
 * Get detailed call information with related appointment
 * GET /api/calls/:id/details
 */
const getCallDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const call = await Call.findById(id)
      .populate('patientId', 'firstName lastName email phone username age medicalHistory')
      .populate('appointmentId')
      .populate('suggestedDoctor', 'firstName lastName specialization department');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Call details retrieved',
      data: call
    });
  } catch (error) {
    console.error('Get Call Details Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve call details',
      error: error.message
    });
  }
};

/**
 * Update call with appointment information
 * PUT /api/calls/:id/appointment
 */
const updateCallWithAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentId, suggestedDoctor, symptoms, notes } = req.body;

    const call = await Call.findById(id);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (appointmentId) {
      call.appointmentId = appointmentId;
      call.appointmentBooked = true;
    }
    if (suggestedDoctor) call.suggestedDoctor = suggestedDoctor;
    if (symptoms) call.symptoms = symptoms;
    if (notes) call.notes = notes;

    await call.save();

    await call.populate([
      'patientId',
      'appointmentId',
      'suggestedDoctor'
    ]);

    res.status(200).json({
      success: true,
      message: 'Call updated with appointment info',
      data: call
    });
  } catch (error) {
    console.error('Update Call Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update call',
      error: error.message
    });
  }
};

/**
 * Get calls with pagination and filters
 * GET /api/calls
 */
const getCalls = async (req, res) => {
  try {
    const { status, appointmentBooked, emergency, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.callStatus = status;
    if (appointmentBooked !== undefined) filter.appointmentBooked = appointmentBooked === 'true';
    if (emergency !== undefined) filter.isEmergency = emergency === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const calls = await Call.find(filter)
      .populate('patientId', 'firstName lastName email phone username')
      .populate('appointmentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Call.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Calls retrieved',
      data: calls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Calls Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve calls',
      error: error.message
    });
  }
};

module.exports = {
  getAllCalls,
  getCallById,
  initiateCall,
  getCallStatus,
  handleIncomingCall,
  bookAppointmentFromCall,
  getCallDetails,
  updateCallWithAppointment,
  getCalls
};
