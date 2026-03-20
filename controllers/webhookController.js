const Patient = require('../models/Patient');
const Call = require('../models/Call');

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

module.exports = { handleVapiWebhook };
