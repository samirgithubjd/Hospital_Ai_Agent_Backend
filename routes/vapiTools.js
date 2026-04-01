const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Slot = require('../models/Slot');
const Appointment = require('../models/Appointment');

/**
 * VAPI Tool Handler
 * Receives tool calls from VAPI assistant and processes them
 */
router.post('/', async (req, res) => {
  try {
    const { toolUse, messages } = req.body;

    console.log('🔧 VAPI Tool Call Received:', {
      toolName: toolUse?.toolName,
      timestamp: new Date().toISOString()
    });

    let response = {};

    // Route to appropriate handler based on tool name
    switch (toolUse?.toolName) {
      case 'check_patient':
        response = await handleCheckPatient(toolUse.input);
        break;

      case 'get_available_slots':
        response = await handleGetAvailableSlots(toolUse.input);
        break;

      case 'book_appointment':
        response = await handleBookAppointment(toolUse.input);
        break;

      case 'check_symptoms':
        response = await handleCheckSymptoms(toolUse.input);
        break;

      case 'find_doctor':
        response = await handleFindDoctor(toolUse.input);
        break;

      default:
        response = {
          error: `Unknown tool: ${toolUse?.toolName}`,
          availableTools: ['check_patient', 'get_available_slots', 'book_appointment', 'check_symptoms', 'find_doctor']
        };
    }

    console.log('✅ Tool Response:', {
      toolName: toolUse?.toolName,
      success: !response.error,
      responseSize: JSON.stringify(response).length
    });

    res.status(200).json({
      success: true,
      result: response,
      toolName: toolUse?.toolName
    });
  } catch (error) {
    console.error('❌ Tool Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolName: toolUse?.toolName
    });
  }
});

/**
 * ============================================
 * DEDICATED VAPI ENDPOINTS FOR DIRECT CALLS
 * ============================================
 */

/**
 * @route   POST /api/vapi-tools/check-slots-availability
 * @desc    Check available slots for a doctor or specialty (VAPI Direct Call)
 * @access  Public (No Auth Required - Direct VAPI Integration)
 * @body    { doctorId, date, specialty, specialization, limit }
 * @example
 * Request:
 * {
 *   "date": "2024-04-15",
 *   "specialty": "Cardiology",
 *   "limit": 10
 * }
 * Response:
 * {
 *   "success": true,
 *   "date": "2024-04-15",
 *   "slotCount": 5,
 *   "availableSlots": [
 *     {
 *       "slotId": "507f1f77bcf86cd799439011",
 *       "doctorId": "507f1f77bcf86cd799439012",
 *       "doctorName": "Dr. John Doe",
 *       "specialty": "Cardiology",
 *       "time": "09:00",
 *       "timeFormatted": "09:00 AM",
 *       "fee": 500,
 *       "duration": 30,
 *       "location": "Main Hospital"
 *     }
 *   ]
 * }
 */
/**
 * Enhanced Check Slots Availability with Doctor Preference & Fallback
 * - First check preferred doctor's availability
 * - If no slots from preferred doctor, suggest alternatives from same specialty
 */
router.post('/check-slots-availability', async (req, res) => {
  try {
    const { 
      doctorId, 
      doctor_id, 
      date, 
      specialty, 
      specialization, 
      preferredDoctorId,
      preferred_doctor_id,
      limit = 10,
      includeAlternatives = true 
    } = req.body;

    // Validation
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required (format: YYYY-MM-DD)'
      });
    }

    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(searchDate.getTime() + 86400000);

    const finalPreferredDoctorId = preferredDoctorId || preferred_doctor_id || doctorId || doctor_id;
    const finalSpecialty = specialty || specialization;

    console.log('📅 VAPI Check Slots Availability (Enhanced):', {
      date,
      preferredDoctorId: finalPreferredDoctorId,
      specialty: finalSpecialty,
      includeAlternatives,
      limit
    });

    // ============================================
    // SCENARIO 1: Check preferred doctor's slots
    // ============================================
    if (finalPreferredDoctorId) {
      const preferredDoctor = await User.findById(finalPreferredDoctorId).select(
        'firstName lastName specialization phone email role isActive'
      );

      if (!preferredDoctor || preferredDoctor.role !== 'doctor') {
        return res.status(404).json({
          success: false,
          error: `Doctor not found with ID: ${finalPreferredDoctorId}`
        });
      }

      console.log(`🎯 Checking preferred doctor: ${preferredDoctor.firstName} ${preferredDoctor.lastName}`);

      // Get preferred doctor's slots
      const preferredSlots = await Slot.find({
        doctorId: finalPreferredDoctorId,
        date: {
          $gte: searchDate,
          $lt: nextDay
        },
        isAvailable: true
      })
        .populate('doctorId', 'firstName lastName specialization phone email')
        .sort({ startTime: 1 })
        .limit(limit);

      // Format preferred doctor's slots
      const formattedPreferredSlots = preferredSlots.map(slot => ({
        slotId: slot._id,
        doctorId: slot.doctorId._id,
        doctorName: `${slot.doctorId.firstName} ${slot.doctorId.lastName}`,
        specialty: slot.doctorId.specialization,
        doctorPhone: slot.doctorId.phone,
        doctorEmail: slot.doctorId.email,
        date: date,
        time: slot.startTime,
        timeFormatted: new Date(`2000-01-01T${slot.startTime}`).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        fee: slot.fee || 0,
        duration: slot.slotDuration,
        location: slot.location || 'Not specified',
        isAvailable: slot.isAvailable,
        isPreferred: true
      }));

      // ======================================================
      // If preferred doctor has slots, return them directly
      // ======================================================
      if (formattedPreferredSlots.length > 0) {
        return res.status(200).json({
          success: true,
          date: date,
          preferredDoctorSchedule: {
            doctorId: preferredDoctor._id,
            doctorName: `${preferredDoctor.firstName} ${preferredDoctor.lastName}`,
            specialty: preferredDoctor.specialization,
            slotCount: formattedPreferredSlots.length,
            slots: formattedPreferredSlots
          },
          alternatives: null,
          slotType: 'preferred',
          message: `✅ Found ${formattedPreferredSlots.length} available slots with preferred doctor ${preferredDoctor.firstName} ${preferredDoctor.lastName}`
        });
      }

      // ======================================================
      // If preferred doctor has NO slots & includeAlternatives
      // ======================================================
      if (includeAlternatives) {
        console.log(`⚠️  No slots for ${preferredDoctor.firstName}. Fetching alternatives...`);

        // Get other doctors with same specialty
        const alternativeDoctors = await User.find({
          role: 'doctor',
          isActive: true,
          specialization: new RegExp(preferredDoctor.specialization, 'i'),
          _id: { $ne: finalPreferredDoctorId } // Exclude preferred doctor
        }).select('_id');

        if (alternativeDoctors.length === 0) {
          return res.status(200).json({
            success: true,
            date: date,
            preferredDoctorSchedule: {
              doctorId: preferredDoctor._id,
              doctorName: `${preferredDoctor.firstName} ${preferredDoctor.lastName}`,
              specialty: preferredDoctor.specialization,
              slotCount: 0,
              slots: [],
              status: 'unavailable'
            },
            alternatives: null,
            slotType: 'no_preference_no_alternatives',
            message: `❌ ${preferredDoctor.firstName} ${preferredDoctor.lastName} has no available slots on ${date}, and no other ${preferredDoctor.specialization} doctors are available.`
          });
        }

        const alternativeDoctorIds = alternativeDoctors.map(doc => doc._id);

        // Get alternative slots
        const alternativeSlots = await Slot.find({
          doctorId: { $in: alternativeDoctorIds },
          date: {
            $gte: searchDate,
            $lt: nextDay
          },
          isAvailable: true
        })
          .populate('doctorId', 'firstName lastName specialization phone email')
          .sort({ startTime: 1 })
          .limit(limit * 2); // Get more alternatives

        // Group alternatives by doctor
        const groupedByDoctor = {};
        alternativeSlots.forEach(slot => {
          const docId = slot.doctorId._id.toString();
          if (!groupedByDoctor[docId]) {
            groupedByDoctor[docId] = {
              doctorId: slot.doctorId._id,
              doctorName: `${slot.doctorId.firstName} ${slot.doctorId.lastName}`,
              specialty: slot.doctorId.specialization,
              doctorPhone: slot.doctorId.phone,
              doctorEmail: slot.doctorId.email,
              slots: []
            };
          }
          groupedByDoctor[docId].slots.push({
            slotId: slot._id,
            date: date,
            time: slot.startTime,
            timeFormatted: new Date(`2000-01-01T${slot.startTime}`).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            fee: slot.fee || 0,
            duration: slot.slotDuration,
            location: slot.location || 'Not specified',
            isAvailable: slot.isAvailable
          });
        });

        const alternativesArray = Object.values(groupedByDoctor);

        return res.status(200).json({
          success: true,
          date: date,
          preferredDoctorSchedule: {
            doctorId: preferredDoctor._id,
            doctorName: `${preferredDoctor.firstName} ${preferredDoctor.lastName}`,
            specialty: preferredDoctor.specialization,
            slotCount: 0,
            slots: [],
            status: 'unavailable'
          },
          alternatives: {
            alternativeCount: alternativesArray.length,
            totalAlternativeSlots: alternativeSlots.length,
            doctorsList: alternativesArray
          },
          slotType: 'alternatives_suggested',
          message: `❌ No slots available for ${preferredDoctor.firstName} ${preferredDoctor.lastName}. 
            However, we found available slots with ${alternativesArray.length} other ${preferredDoctor.specialization} doctor(s). 
            Would you like to book with another doctor instead?`
        });
      }

      // No alternatives & no preferred slots
      return res.status(200).json({
        success: true,
        date: date,
        preferredDoctorSchedule: {
          doctorId: preferredDoctor._id,
          doctorName: `${preferredDoctor.firstName} ${preferredDoctor.lastName}`,
          specialty: preferredDoctor.specialization,
          slotCount: 0,
          slots: [],
          status: 'unavailable'
        },
        alternatives: null,
        slotType: 'no_slots_no_alternatives',
        message: `❌ No available slots for ${preferredDoctor.firstName} ${preferredDoctor.lastName} on ${date}`
      });
    }

    // ============================================
    // SCENARIO 2: Search by specialty only
    // ============================================
    if (finalSpecialty) {
      const doctorQuery = {
        role: 'doctor',
        isActive: true,
        specialization: new RegExp(finalSpecialty, 'i')
      };

      const doctors = await User.find(doctorQuery, '_id firstName lastName specialization phone email');
      const doctorIds = doctors.map(doc => doc._id);

      if (doctorIds.length === 0) {
        return res.status(200).json({
          success: true,
          date: date,
          slotCount: 0,
          availableSlots: [],
          doctorCount: 0,
          message: `No doctors available with specialization "${finalSpecialty}" on ${date}`
        });
      }

      const query = {
        doctorId: { $in: doctorIds },
        date: {
          $gte: searchDate,
          $lt: nextDay
        },
        isAvailable: true
      };

      // Fetch slots with doctor details
      const slots = await Slot.find(query)
        .populate('doctorId', 'firstName lastName specialization phone email')
        .sort({ startTime: 1 })
        .limit(limit);

      console.log(`✅ Found ${slots.length} available slots on ${date}`);

      // Format response for VAPI
      const formattedSlots = slots.map(slot => ({
        slotId: slot._id,
        doctorId: slot.doctorId._id,
        doctorName: `${slot.doctorId.firstName} ${slot.doctorId.lastName}`,
        specialty: slot.doctorId.specialization,
        doctorPhone: slot.doctorId.phone,
        doctorEmail: slot.doctorId.email,
        date: date,
        time: slot.startTime,
        timeFormatted: new Date(`2000-01-01T${slot.startTime}`).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        fee: slot.fee || 0,
        duration: slot.slotDuration,
        location: slot.location || 'Not specified',
        isAvailable: slot.isAvailable
      }));

      return res.status(200).json({
        success: true,
        date: date,
        doctorCount: doctors.length,
        slotCount: formattedSlots.length,
        availableSlots: formattedSlots,
        specialty: finalSpecialty,
        message: formattedSlots.length > 0 
          ? `Found ${formattedSlots.length} available slots from ${new Set(formattedSlots.map(s => s.doctorName)).size} doctor(s) in ${finalSpecialty}`
          : `No available slots found for ${finalSpecialty} on ${date}`
      });
    }

    // No valid parameters
    return res.status(400).json({
      success: false,
      error: 'Either doctorId/preferredDoctorId or specialty is required'
    });

  } catch (error) {
    console.error('❌ Check Slots Availability Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      availableSlots: []
    });
  }
});

/**
 * @route   POST /api/vapi-tools/check-patient
 * @desc    Check if patient exists (VAPI Direct Call)
 * @access  Public (No Auth Required - Direct VAPI Integration)
 * @body    { phone, email, phoneNumber }
 */
router.post('/check-patient', async (req, res) => {
  try {
    const result = await handleCheckPatient(req.body);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Check Patient Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/vapi-tools/find-doctor
 * @desc    Find doctors by specialty (VAPI Direct Call)
 * @access  Public (No Auth Required - Direct VAPI Integration)
 * @body    { specialization, specialty, limit }
 */
router.post('/find-doctor', async (req, res) => {
  try {
    const result = await handleFindDoctor(req.body);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Find Doctor Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Tool: Check Patient
 * Find patient by phone number or email
 * Returns patient details if found, indicates if new patient
 */
async function handleCheckPatient(input) {
  try {
    const { phone, email, phoneNumber } = input;
    const searchPhone = phone || phoneNumber;

    console.log('🔍 Checking Patient:', { searchPhone, email });

    let query = { role: 'patient' };

    if (searchPhone) {
      // Normalize phone number
      const normalized = searchPhone.replace(/\D/g, '');
      query.$or = [
        { phone: searchPhone },
        { phone: { $regex: normalized, $options: 'i' } }
      ];
    }

    if (email) {
      query.email = email;
    }

    const patient = await User.findOne(query).select(
      '_id firstName lastName email phone dateOfBirth gender emergencyContact'
    );

    if (patient) {
      console.log('✅ Patient Found:', patient._id);
      return {
        found: true,
        isExisting: true,
        patientId: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        message: `Patient ${patient.firstName} found in system`
      };
    } else {
      console.log('ℹ️ Patient Not Found - New Patient');
      return {
        found: false,
        isExisting: false,
        isNew: true,
        message: 'Patient not found. Treat as new patient and collect details.'
      };
    }
  } catch (error) {
    console.error('❌ Check Patient Error:', error.message);
    return {
      error: error.message,
      found: false
    };
  }
}

/**
 * Tool: Get Available Slots
 * Returns available time slots for given date and doctor/specialty
 */
async function handleGetAvailableSlots(input) {
  try {
    const { date, doctorId, doctor_id, specialization, specialty } = input;
    const searchDate = new Date(date);
    const nextDay = new Date(searchDate.getTime() + 86400000);

    console.log('📅 Getting Available Slots:', {
      date: searchDate.toISOString().split('T')[0],
      doctorId: doctorId || doctor_id,
      specialization: specialization || specialty
    });

    let query = {
      date: {
        $gte: searchDate,
        $lt: nextDay
      },
      isAvailable: true
    };

    // Filter by specific doctor
    if (doctorId || doctor_id) {
      query.doctorId = doctorId || doctor_id;
    }
    // Filter by specialization if doctor not specified
    else if (specialization || specialty) {
      const doctorQuery = {
        role: 'doctor',
        isActive: true,
        specialization: new RegExp(specialization || specialty, 'i')
      };

      const doctors = await User.find(doctorQuery, '_id');
      const doctorIds = doctors.map(doc => doc._id);

      if (doctorIds.length === 0) {
        return {
          date: date,
          availableSlots: [],
          message: `No doctors with specialization "${specialization || specialty}" found`
        };
      }

      query.doctorId = { $in: doctorIds };
    }

    const slots = await Slot.find(query)
      .populate('doctorId', 'firstName lastName specialization phone')
      .sort({ startTime: 1 })
      .limit(10);

    console.log(`✅ Found ${slots.length} available slots`);

    return {
      date: date,
      slotCount: slots.length,
      availableSlots: slots.map(slot => ({
        slotId: slot._id,
        doctorId: slot.doctorId._id,
        time: slot.startTime,
        timeFormatted: new Date(slot.startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        doctorName: `${slot.doctorId.firstName} ${slot.doctorId.lastName}`,
        doctorSpecialty: slot.doctorId.specialization,
        doctorPhone: slot.doctorId.phone
      })),
      message: `Found ${slots.length} available slots for ${date}`
    };
  } catch (error) {
    console.error('❌ Get Available Slots Error:', error.message);
    return {
      error: error.message,
      availableSlots: [],
      date: input.date
    };
  }
}

/**
 * Tool: Book Appointment
 * Create new appointment after collecting all required details
 */
async function handleBookAppointment(input) {
  try {
    const { patientId, patient_id, doctorId, doctor_id, date, time, symptoms } = input;
    const finalPatientId = patientId || patient_id;
    const finalDoctorId = doctorId || doctor_id;

    console.log('📝 Booking Appointment:', {
      patientId: finalPatientId,
      doctorId: finalDoctorId,
      date,
      time,
      symptoms
    });

    // Validate inputs
    if (!finalPatientId || !finalDoctorId || !date || !time) {
      return {
        error: 'Missing required fields: patientId, doctorId, date, time',
        details: {
          patientId: finalPatientId ? 'provided' : 'missing',
          doctorId: finalDoctorId ? 'provided' : 'missing',
          date: date ? 'provided' : 'missing',
          time: time ? 'provided' : 'missing'
        }
      };
    }

    // Parse date and time
    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Check if slot exists and is available
    const slot = await Slot.findOne({
      doctorId: finalDoctorId,
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 86400000)
      },
      startTime: appointmentDate,
      isAvailable: true
    });

    if (!slot) {
      console.log('❌ Slot not available');
      return {
        error: 'Selected slot is not available. Please choose another time.',
        available: false
      };
    }

    // Verify patient and doctor exist
    const [patient, doctor] = await Promise.all([
      User.findById(finalPatientId),
      User.findById(finalDoctorId)
    ]);

    if (!patient) {
      return { error: `Patient not found: ${finalPatientId}` };
    }

    if (!doctor) {
      return { error: `Doctor not found: ${finalDoctorId}` };
    }

    // Create appointment
    const appointment = new Appointment({
      patientId: finalPatientId,
      doctorId: finalDoctorId,
      appointmentDate: appointmentDate,
      appointmentTime: time,
      symptoms: symptoms || 'General Checkup',
      status: 'scheduled',
      notes: 'Booked via AI Voice Agent',
      bookedVia: 'voice_agent',
      bookedAt: new Date()
    });

    await appointment.save();

    // Mark slot as unavailable
    slot.isAvailable = false;
    slot.appointmentId = appointment._id;
    await slot.save();

    console.log('✅ Appointment Created:', appointment._id);

    return {
      success: true,
      appointmentId: appointment._id,
      appointmentDate: appointmentDate.toISOString().split('T')[0],
      appointmentTime: time,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      doctorSpecialty: doctor.specialization,
      symptoms: symptoms,
      confirmationMessage: `✅ Appointment confirmed for ${appointmentDate.toLocaleDateString()} at ${time} with Dr. ${doctor.lastName}. You will receive an SMS and email confirmation.`
    };
  } catch (error) {
    console.error('❌ Book Appointment Error:', error.message);
    return {
      error: error.message,
      success: false
    };
  }
}

/**
 * Tool: Check Symptoms
 * Analyze symptoms and determine if emergency, suggest specialization
 */
async function handleCheckSymptoms(input) {
  try {
    const { symptoms } = input;

    console.log('🏥 Checking Symptoms:', symptoms);

    // Emergency keywords
    const emergencyKeywords = [
      'chest pain',
      'breathing',
      'difficulty breathing',
      'shortness of breath',
      'severe chest',
      'bleeding',
      'heavy bleeding',
      'accident',
      'unconscious',
      'unresponsive',
      'heart attack',
      'stroke',
      'seizure',
      'poison',
      'overdose'
    ];

    const symptomsLower = symptoms.toLowerCase();
    const isEmergency = emergencyKeywords.some(keyword =>
      symptomsLower.includes(keyword)
    );

    // Specialty matching
    let suggestedSpecialty = 'General Medicine';
    let specialtyReason = 'General consultation';

    const specialtyMap = {
      'Cardiology': ['heart', 'chest pain', 'palpitation', 'cardiac'],
      'Neurology': ['head', 'brain', 'migraine', 'seizure', 'dizziness', 'neurological'],
      'Dermatology': ['skin', 'rash', 'acne', 'eczema', 'dermatological'],
      'Orthopedics': ['bone', 'joint', 'fracture', 'sprain', 'musculoskeletal'],
      'ENT': ['ear', 'nose', 'throat', 'sore throat', 'hearing'],
      'Pediatrics': ['child', 'baby', 'infant', 'kid'],
      'Gynecology': ['pregnancy', 'female', 'breast', 'uterus', 'menstrual'],
      'Pulmonology': ['lung', 'breath', 'cough', 'asthma', 'respiratory']
    };

    for (const [specialty, keywords] of Object.entries(specialtyMap)) {
      if (keywords.some(keyword => symptomsLower.includes(keyword))) {
        suggestedSpecialty = specialty;
        specialtyReason = `Detected "${keywords[0]}" in symptoms`;
        break;
      }
    }

    console.log('✅ Symptoms Analyzed:', {
      isEmergency,
      suggestedSpecialty
    });

    return {
      isEmergency,
      emergencySeverity: isEmergency ? 'high' : 'normal',
      suggestedSpecialty,
      specialtyReason,
      symptoms: symptoms,
      emergencyInstructions: isEmergency
        ? 'This appears to be a medical emergency. Please visit the nearest hospital or call emergency services immediately.'
        : 'This is not an emergency. You can schedule an appointment.',
      recommendedAction: isEmergency ? 'emergency' : 'appointment'
    };
  } catch (error) {
    console.error('❌ Check Symptoms Error:', error.message);
    return {
      error: error.message,
      isEmergency: false
    };
  }
}

/**
 * Tool: Find Doctor
 * Find a doctor by name or specialty
 */
async function handleFindDoctor(input) {
  try {
    const { doctorName, doctor_name, specialization, specialty } = input;
    const searchName = doctorName || doctor_name;
    const searchSpecialty = specialization || specialty;

    console.log('🏥 Finding Doctor:', {
      name: searchName,
      specialty: searchSpecialty
    });

    let query = { role: 'doctor', isActive: true };

    if (searchName) {
      query.$or = [
        { firstName: { $regex: searchName, $options: 'i' } },
        { lastName: { $regex: searchName, $options: 'i' } }
      ];
    }

    if (searchSpecialty) {
      query.specialization = { $regex: searchSpecialty, $options: 'i' };
    }

    const doctors = await User.find(query)
      .select('_id firstName lastName specialization phone email')
      .limit(5);

    if (doctors.length === 0) {
      console.log('ℹ️ No doctors found matching criteria');
      return {
        found: false,
        doctors: [],
        message: `No doctors found${searchName ? ` matching "${searchName}"` : ''}${searchSpecialty ? ` with ${searchSpecialty}` : ''}`
      };
    }

    console.log(`✅ Found ${doctors.length} doctors`);

    return {
      found: true,
      doctorCount: doctors.length,
      doctors: doctors.map(doc => ({
        doctorId: doc._id,
        name: `${doc.firstName} ${doc.lastName}`,
        specialty: doc.specialization,
        phone: doc.phone,
        email: doc.email
      })),
      message: `Found ${doctors.length} available doctors`
    };
  } catch (error) {
    console.error('❌ Find Doctor Error:', error.message);
    return {
      error: error.message,
      found: false,
      doctors: []
    };
  }
}

module.exports = router;
