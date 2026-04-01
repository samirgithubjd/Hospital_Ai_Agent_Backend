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

    // Prepare VAPI call payload - phoneNumber must be an object
    const callPayload = {
      phoneNumber: {
        numberE164: targetPhone.startsWith('+') ? targetPhone : `+${targetPhone}`
      },
      firstMessage: message || 'Hello, this is a call from Hospital AI Voice Agent. Please provide your information.'
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

/**
 * Initiate AI Agent Call for Appointment Booking
 * POST /api/calls/ai-appointment-booking/initiate
 * 
 * This endpoint creates a VAPI call where the AI agent:
 * 1. Greets the patient
 * 2. Collects appointment details (doctor, date, time, symptoms)
 * 3. Confirms the booking information
 * 4. Creates appointment record via webhook
 */
const initiateAIAppointmentBookingCall = async (req, res) => {
  try {
    const { patientId, phoneNumber, preferredDoctor, symptoms, isEmergency } = req.body;

    if (!phoneNumber && !patientId) {
      return res.status(400).json({
        success: false,
        message: 'Either phoneNumber or patientId is required',
        example: {
          phoneNumber: '+1-914-555-1234',
          isEmergency: false
        }
      });
    }

    let patient = null;
    let targetPhone = phoneNumber;

    // If patientId provided, get patient details
    if (patientId) {
      patient = await User.findById(patientId);
      if (!patient || patient.role !== 'patient') {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
      targetPhone = patient.phone;
    }

    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number is required'
      });
    }

    // Get available doctors
    const doctors = await User.find({ role: 'doctor', isActive: true })
      .select('firstName lastName specialization department');

    if (doctors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No doctors available for booking'
      });
    }

    // Create AI-powered booking prompt
    const doctorsList = doctors.map(doc => `${doc.firstName} ${doc.lastName} (${doc.specialization})`).join(', ');
    
    const appointmentBookingPrompt = `
Hello! Welcome to Hospital AI Appointment Booking System.

I'm here to help you book an appointment with our experienced doctors.

We have the following doctors available: ${doctorsList}

To complete your booking, I'll need to know:
1. Which doctor would you prefer? (or their specialization)
2. What are your symptoms or reason for visit?
3. Your preferred date for the appointment (in YYYY-MM-DD format)
4. Your preferred time (in HH:MM format, 24-hour)

Is this for an emergency? If yes, please let me know immediately.

Please start by telling me which doctor or specialization you're interested in.
    `;

    // Prepare VAPI call payload - VAPI API requires specific format
    // phoneNumber must be an object with numberE164 property
    const callPayload = {
      phoneNumber: {
        numberE164: targetPhone.startsWith('+') ? targetPhone : `+${targetPhone}`
      },
      firstMessage: appointmentBookingPrompt,
      // Custom metadata for webhook processing - stored in VAPI
      customerMetadata: {
        type: 'appointment-booking',
        patientId: patient ? patient._id.toString() : null,
        preferredDoctor: preferredDoctor || null,
        symptoms: symptoms || null,
        isEmergency: isEmergency || false,
        doctorsAvailable: doctorsList,
        createdAt: new Date().toISOString()
      }
    };

    // Validate VAPI configuration
    if (!vapiConfig.apiKey) {
      throw new Error('VAPI_API_KEY environment variable is not configured');
    }

    // Make VAPI API call (try /call endpoint first, then /calls)
    let response;
    try {
      // Try the standard /call endpoint
      response = await axios.post(
        `${vapiConfig.baseUrl}/call`,
        callPayload,
        {
          headers: vapiConfig.headers,
          timeout: 10000
        }
      );
    } catch (vapiError) {
      // Log detailed error for debugging
      console.error('VAPI API Error Details:', {
        status: vapiError.response?.status,
        statusText: vapiError.response?.statusText,
        data: vapiError.response?.data,
        message: vapiError.message,
        code: vapiError.code,
        config: {
          baseUrl: vapiConfig.baseUrl,
          endpoint: `${vapiConfig.baseUrl}/call`,
          hasApiKey: !!vapiConfig.apiKey,
          phoneNumber: vapiConfig.phoneNumber,
          payload: callPayload
        }
      });
      
      // If 404 error, maybe endpoint is /calls not /call
      if (vapiError.response?.status === 404) {
        console.log('Trying alternative endpoint: /calls');
        try {
          response = await axios.post(
            `${vapiConfig.baseUrl}/calls`,
            callPayload,
            {
              headers: vapiConfig.headers,
              timeout: 10000
            }
          );
          console.log('Success with /calls endpoint');
        } catch (secondError) {
          console.error('Alternative endpoint also failed:', secondError.response?.data);
          throw new Error(`VAPI API failed: ${secondError.response?.data?.message || secondError.message}`);
        }
      } else {
        throw new Error(`VAPI API failed: ${vapiError.response?.data?.message || vapiError.message}`);
      }
    }

    // Create call record with appointment booking flag
    const call = new Call({
      patientId: patient ? patient._id : null,
      phoneNumber: targetPhone,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
      callType: 'outbound',
      status: 'initiated',
      vapiCallId: response.data.id || response.data.callId,
      isEmergency: isEmergency || false,
      symptoms,
      suggestedDoctor: preferredDoctor,
      notes: 'AI-powered appointment booking call',
      vapiCallData: {
        type: 'appointment-booking',
        appointmentBookingMode: true,
        doctorsList
      }
    });

    await call.save();

    // Populate if patient exists
    if (patient) {
      await call.populate('patientId', 'firstName lastName email phone username');
    }

    res.status(201).json({
      success: true,
      message: 'AI appointment booking call initiated successfully',
      data: {
        callId: call._id,
        vapiCallId: response.data.id || response.data.callId,
        patientId: patient ? patient._id : null,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        phoneNumber: targetPhone,
        fromNumber: vapiConfig.phoneNumber,
        callType: 'ai-appointment-booking',
        status: 'initiated',
        nextSteps: 'AI agent will collect appointment details and create booking. You will receive confirmation via SMS/Email.',
        estimatedDuration: '3-5 minutes'
      }
    });
  } catch (error) {
    console.error('Initiate AI Appointment Booking Call Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate AI appointment booking call',
      error: error.message,
      details: error.response?.data || 'Check server logs for details'
    });
  }
};

/**
 * Process appointment booking from AI call webhook
 * POST /api/calls/ai-appointment-booking/process
 * 
 * This endpoint is called by the webhook after the AI agent collects all info
 */
const processAIAppointmentBooking = async (req, res) => {
  try {
    const { callId, aiExtractedData } = req.body;

    if (!callId || !aiExtractedData) {
      return res.status(400).json({
        success: false,
        message: 'callId and aiExtractedData are required'
      });
    }

    const { 
      patientId, 
      doctorName, 
      appointmentDate, 
      appointmentTime, 
      symptoms,
      isEmergency,
      transcript
    } = aiExtractedData;

    // Get the call record
    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Find the doctor
    const doctor = await User.findOne({
      $or: [
        { firstName: doctorName },
        { lastName: doctorName },
        { username: doctorName.toLowerCase() }
      ],
      role: 'doctor',
      isActive: true
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found - unable to complete booking'
      });
    }

    // Verify patient
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      patientId,
      doctorId: doctor._id,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      symptoms,
      status: 'scheduled',
      isEmergency: isEmergency || false,
      priority: isEmergency ? 'urgent' : 'medium',
      callId: call._id,
      notes: `Booked via AI Agent Call. Transcript: ${transcript}`
    });

    await appointment.save();

    // Update call record
    call.appointmentId = appointment._id;
    call.appointmentBooked = true;
    call.status = 'completed';
    call.transcript = transcript;
    call.symptoms = symptoms;
    await call.save();

    // Populate appointment details
    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName email phone' },
      { path: 'doctorId', select: 'firstName lastName specialization department' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully via AI agent',
      data: {
        appointment,
        callDetails: {
          callId: call._id,
          transcript: call.transcript,
          status: 'completed',
          appointmentBooked: true
        }
      }
    });
  } catch (error) {
    console.error('Process AI Appointment Booking Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI appointment booking',
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
  getCalls,
  initiateAIAppointmentBookingCall,
  processAIAppointmentBooking
};
