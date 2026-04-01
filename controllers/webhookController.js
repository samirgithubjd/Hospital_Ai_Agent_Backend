const Patient = require('../models/Patient');
const Call = require('../models/Call');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Slot = require('../models/Slot');

// Emergency keywords to detect
const EMERGENCY_KEYWORDS = [
  'chest pain',
  'chest pains',
  'accident',
  'bleeding',
  'unconscious',
  'heart attack',
  'breathing difficulty',
  'difficulty breathing',
  'severe pain',
  'critical',
  'emergency'
];

const detectEmergency = (transcript) => {
  if (!transcript) return false;
  
  const lowerTranscript = transcript.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => 
    lowerTranscript.includes(keyword)
  );
};

/**
 * Extract patient information from transcript using AI-friendly patterns
 */
const extractPatientInfo = (transcript) => {
  const info = {
    name: null,
    age: null,
    symptoms: null
  };

  if (!transcript) return info;

  const lowerTranscript = transcript.toLowerCase();

  // Extract name (simple pattern - look for "my name is" or "I'm")
  const nameMatch = transcript.match(/(?:my name is|i'm|i am)\s+([a-zA-Z]+)/i);
  if (nameMatch) {
    info.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
  }

  // Extract age (look for "I'm X years old" or "age is X")
  const ageMatch = transcript.match(/(?:i'm|i am|age is)\s+(\d+)/i);
  if (ageMatch) {
    info.age = parseInt(ageMatch[1], 10);
  }

  // Extract symptoms (store entire transcript as symptoms)
  info.symptoms = transcript;

  return info;
};

/**
 * Detect if user is new or existing patient based on transcript
 */
const detectPatientStatus = async (phoneNumber, transcript = '') => {
  try {
    // First, check if phone exists in User collection (existing patient)
    const existingUser = await User.findOne({
      phone: phoneNumber,
      role: 'patient'
    });

    if (existingUser) {
      return {
        isNew: false,
        patientId: existingUser._id,
        userName: `${existingUser.firstName} ${existingUser.lastName}`,
        email: existingUser.email
      };
    }

    // Check if mentioned in transcript that they're existing, or if they provide ID
    const idMatch = transcript.match(/(?:patient id|my id is|id number)\s+([a-zA-Z0-9]+)/i);
    if (idMatch) {
      const foundPatient = await User.findOne({
        $or: [
          { _id: idMatch[1] },
          { username: idMatch[1].toLowerCase() }
        ],
        role: 'patient'
      });

      if (foundPatient) {
        return {
          isNew: false,
          patientId: foundPatient._id,
          userName: `${foundPatient.firstName} ${foundPatient.lastName}`,
          email: foundPatient.email
        };
      }
    }

    // If not found, patient is new
    return {
      isNew: true,
      patientId: null,
      userName: null,
      email: null
    };
  } catch (error) {
    console.error('Detect Patient Status Error:', error.message);
    return { isNew: true, patientId: null };
  }
};

/**
 * Extract appointment details from transcript
 */
const extractAppointmentDetails = (transcript) => {
  if (!transcript) return {};

  const details = {
    doctorName: null,
    specialization: null,
    appointmentDate: null,
    appointmentTime: null,
    symptoms: null,
    isConfirmed: false
  };

  // Extract date (YYYY-MM-DD or various date formats)
  const dateMatch = transcript.match(/(\d{4}-\d{2}-\d{2}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})/i);
  if (dateMatch) {
    details.appointmentDate = dateMatch[1];
  }

  // Extract time (HH:MM or H:MM or "2 PM" etc)
  const timeMatch = transcript.match(/(\d{1,2}):(\d{2})\s*(am|pm)?|\b(morning|afternoon|evening|noon)\b/i);
  if (timeMatch) {
    details.appointmentTime = timeMatch[0];
  }

  // Extract doctor name or specialization
  const docMatch = transcript.match(/(?:doctor|dr\.?)\s+([a-zA-Z]+)|(?:specialist in|specialization in)\s+([a-zA-Z]+)/i);
  if (docMatch) {
    details.doctorName = docMatch[1] || docMatch[2];
  }

  // Check for relevant specialties
  const specialties = ['cardiology', 'neurology', 'general medicine', 'pediatrics', 'dermatology', 'orthopedics'];
  specialties.forEach(spec => {
    if (transcript.toLowerCase().includes(spec)) {
      details.specialization = spec;
    }
  });

  // Extract symptoms
  const symptomMatch = transcript.match(/(?:reason|symptom|complaint|issue|problem)\s+(?:is|are|:|;)?\s+([^.!?]+)/i);
  if (symptomMatch) {
    details.symptoms = symptomMatch[1].trim();
  } else {
    details.symptoms = transcript; // Use full transcript as fallback
  }

  // Check if appointment was confirmed
  if (transcript.toLowerCase().includes('confirm') || 
      transcript.toLowerCase().includes('correct') ||
      transcript.toLowerCase().includes('yes')) {
    details.isConfirmed = true;
  }

  return details;
};

/**
 * Find matching doctor based on name or specialization
 */
const findMatchingDoctor = async (doctorName, specialization) => {
  try {
    // First try by name
    if (doctorName) {
      const byName = await User.findOne({
        $or: [
          { firstName: new RegExp(doctorName, 'i') },
          { lastName: new RegExp(doctorName, 'i') },
          { username: new RegExp(doctorName, 'i') }
        ],
        role: 'doctor',
        isActive: true
      });

      if (byName) return byName;
    }

    // Then try by specialization
    if (specialization) {
      const bySpec = await User.findOne({
        specialization: new RegExp(specialization, 'i'),
        role: 'doctor',
        isActive: true
      });

      if (bySpec) return bySpec;
    }

    // If nothing matches, get first available doctor
    return await User.findOne({ role: 'doctor', isActive: true });
  } catch (error) {
    console.error('Find Matching Doctor Error:', error.message);
    return null;
  }
};

/**
 * Handle basic VAPI webhook (for general calls)
 */
const handleVapiWebhook = async (req, res) => {
  try {
    const { phoneNumber, duration, status, transcript, recordingUrl } = req.body;

    // Validate webhook payload
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Extract patient information from transcript
    const patientInfo = extractPatientInfo(transcript);
    const isEmergency = detectEmergency(transcript);

    // Create or find patient
    let patient = null;
    if (patientInfo.name || patientInfo.age || patientInfo.symptoms) {
      patient = new Patient({
        name: patientInfo.name,
        age: patientInfo.age,
        phone: phoneNumber,
        symptoms: patientInfo.symptoms,
        isEmergency: isEmergency,
        createdAt: new Date()
      });

      patient = await patient.save();
      console.log(`✓ Patient created/updated: ${patient._id}`);
    }

    // Create call record
    const call = new Call({
      patientId: patient ? patient._id : null,
      phoneNumber,
      duration: duration || 0,
      status: status || 'completed',
      transcript: transcript,
      recordingUrl: recordingUrl,
      createdAt: new Date()
    });

    await call.save();
    console.log(`✓ Call recorded: ${call._id}`);

    // Log emergency
    if (isEmergency) {
      console.warn(`⚠ EMERGENCY CALL DETECTED from ${phoneNumber}`);
      console.warn(`  Patient: ${patientInfo.name || 'Unknown'}`);
      console.warn(`  Transcript excerpt: ${transcript?.substring(0, 100)}...`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        callId: call._id,
        patientId: patient ? patient._id : null,
        isEmergency
      }
    });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
};

/**
 * Enhanced webhook for AI appointment booking calls
 * Processes the collected appointment details and creates booking
 */
const handleAIAppointmentBookingWebhook = async (req, res) => {
  try {
    const { 
      callId, 
      phoneNumber, 
      transcript, 
      recordingUrl,
      status,
      duration
    } = req.body;

    if (!phoneNumber || !transcript) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and transcript are required'
      });
    }

    // Detect patient status (new or existing)
    const patientStatus = await detectPatientStatus(phoneNumber, transcript);
    
    // Extract appointment details from conversation
    const appointmentDetails = extractAppointmentDetails(transcript);
    const isEmergency = detectEmergency(transcript);

    console.log(`📞 Processing AI Booking Call:`);
    console.log(`   Patient Status: ${patientStatus.isNew ? 'NEW' : 'EXISTING'}`);
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Date: ${appointmentDetails.appointmentDate}`);
    console.log(`   Time: ${appointmentDetails.appointmentTime}`);

    // Find or create patient
    let patient;
    if (!patientStatus.isNew) {
      patient = await User.findById(patientStatus.patientId);
    } else {
      // Create new patient from transcript
      const patientInfo = extractPatientInfo(transcript);
      patient = new User({
        firstName: patientInfo.name?.split(' ')[0] || 'Patient',
        lastName: patientInfo.name?.split(' ')[1] || 'New',
        email: `patient_${Date.now()}@hospital.local`,
        phone: phoneNumber,
        role: 'patient',
        username: `patient_${phoneNumber.replace(/\D/g, '')}`,
        password: 'temp_password', // Should be handled properly
        isActive: true
      });

      await patient.save();
      console.log(`✓ New patient created: ${patient._id}`);
    }

    // Find matching doctor
    const doctor = await findMatchingDoctor(
      appointmentDetails.doctorName,
      appointmentDetails.specialization
    );

    if (!doctor) {
      return res.status(400).json({
        success: false,
        message: 'No doctor available matching your preference',
        details: 'Please try again with a different specialization'
      });
    }

    // Check if slot is available
    let slotAvailable = false;
    let slotId = null;

    if (appointmentDetails.appointmentDate && appointmentDetails.appointmentTime) {
      const slot = await Slot.findOne({
        doctorId: doctor._id,
        date: {
          $gte: new Date(appointmentDetails.appointmentDate),
          $lt: new Date(new Date(appointmentDetails.appointmentDate).getTime() + 86400000)
        },
        startTime: { $lte: appointmentDetails.appointmentTime },
        endTime: { $gte: appointmentDetails.appointmentTime },
        isAvailable: true
      });

      if (slot) {
        slotAvailable = true;
        slotId = slot._id;
        slot.isAvailable = false;
        slot.appointmentId = null; // Will be set after appointment creation
        await slot.save();
      }
    }

    // Create appointment if confirmed and slot available
    let appointment = null;
    if (appointmentDetails.isConfirmed && slotAvailable) {
      appointment = new Appointment({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: new Date(appointmentDetails.appointmentDate),
        appointmentTime: appointmentDetails.appointmentTime,
        symptoms: appointmentDetails.symptoms,
        status: 'scheduled',
        isEmergency: isEmergency,
        priority: isEmergency ? 'urgent' : 'medium',
        notes: `Booked via AI Voice Agent. Transcript: ${transcript.substring(0, 200)}...`
      });

      await appointment.save();

      // Link slot to appointment
      if (slotId) {
        await Slot.findByIdAndUpdate(slotId, { 
          appointmentId: appointment._id,
          isAvailable: false 
        });
      }

      console.log(`✓ Appointment created: ${appointment._id}`);
    }

    // Create call record
    const call = new Call({
      patientId: patient._id,
      phoneNumber,
      duration: duration || 0,
      status: status || 'completed',
      transcript: transcript,
      recordingUrl: recordingUrl,
      appointmentId: appointment ? appointment._id : null,
      appointmentBooked: !!appointment,
      callType: 'ai-appointment-booking',
      isEmergency: isEmergency,
      vapiCallId: callId
    });

    await call.save();
    console.log(`✓ Call recorded: ${call._id}`);

    // Populate appointment for response
    if (appointment) {
      await appointment.populate('doctorId', 'firstName lastName specialization department');
    }

    res.status(200).json({
      success: true,
      message: appointmentDetails.isConfirmed && slotAvailable 
        ? 'Appointment booked successfully via AI agent' 
        : 'Call processed. Appointment details extracted but not booked yet.',
      data: {
        callId: call._id,
        patientId: patient._id,
        appointmentBooked: !!appointment,
        appointment: appointment || null,
        extractedDetails: {
          patientStatus: patientStatus.isNew ? 'new' : 'existing',
          doctorName: doctor.firstName + ' ' + doctor.lastName,
          doctorSpec: doctor.specialization,
          date: appointmentDetails.appointmentDate,
          time: appointmentDetails.appointmentTime,
          symptoms: appointmentDetails.symptoms,
          emergency: isEmergency,
          slotAvailable
        },
        transcript: transcript.substring(0, 500)
      }
    });
  } catch (error) {
    console.error('AI Appointment Booking Webhook Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI appointment booking webhook',
      error: error.message
    });
  }
};

module.exports = { 
  handleVapiWebhook,
  handleAIAppointmentBookingWebhook,
  detectPatientStatus,
  extractAppointmentDetails,
  extractPatientInfo,
  findMatchingDoctor
};
