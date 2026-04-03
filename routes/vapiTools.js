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
    // console.log('📥 Raw Slots Request Body:', JSON.stringify(req.body, null, 2));
    
    // Extract payload in multiple formats (for VAPI compatibility)
    let payload = req.body;
    console.log('-----------slot payload--------:', payload);
    
    // If parameters are nested in 'input' object
    if (req.body.input) {
      payload = req.body.input;
      console.log('input-payload:', payload);
      
    }
    // If parameters are nested in 'parameters' object
    else if (req.body.parameters) {
      payload = req.body.parameters;
      console.log('nested-payload:', payload);

    }
    
    console.log('📤 Extracted Slots Payload:', JSON.stringify(payload, null, 2));
    
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
    } = payload;

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
        isBooked: !slot.isAvailable,
        isPreferred: true
      }));

      // ======================================================
      // If preferred doctor has slots, return them directly
      // ======================================================
      if (formattedPreferredSlots.length > 0) {
        return res.status(200).json({
          success: true,
          date: date,
          availabilityStatus: 'available_and_confirmed',
          realTimeCheckPerformed: true,
          preferredDoctorSchedule: {
            doctorId: preferredDoctor._id,
            doctorName: `${preferredDoctor.firstName} ${preferredDoctor.lastName}`,
            specialty: preferredDoctor.specialization,
            slotCount: formattedPreferredSlots.length,
            slots: formattedPreferredSlots,
            availabilityConfirmed: true
          },
          alternatives: null,
          slotType: 'preferred',
          note: 'Real-time availability confirmed. Slots are actively monitored. When you book, the system will atomically reserve the slot to prevent double-booking.',
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
            availabilityStatus: 'no_availability',
            realTimeCheckPerformed: true,
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
            note: 'No alternatives available. Try another date or specialty.',
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
            isAvailable: slot.isAvailable,
            isBooked: !slot.isAvailable
          });
        });

        const alternativesArray = Object.values(groupedByDoctor);

        return res.status(200).json({
          success: true,
          date: date,
          availabilityStatus: 'alternatives_available',
          realTimeCheckPerformed: true,
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
            doctorsList: alternativesArray,
            availabilityConfirmed: true
          },
          slotType: 'alternatives_suggested',
          note: 'Real-time availability confirmed for alternatives. Each slot is reserved atomically upon booking to prevent conflicts.',
          message: `❌ No slots available for ${preferredDoctor.firstName} ${preferredDoctor.lastName}. 
            However, we found available slots with ${alternativesArray.length} other ${preferredDoctor.specialization} doctor(s). 
            Would you like to book with another doctor instead?`
        });
      }

      // No alternatives & no preferred slots
      return res.status(200).json({
        success: true,
        date: date,
        availabilityStatus: 'no_availability',
        realTimeCheckPerformed: true,
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
        note: 'No available slots found. Please try another date or doctor.',
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
          availabilityStatus: 'no_doctors_available',
          realTimeCheckPerformed: true,
          slotCount: 0,
          availableSlots: [],
          doctorCount: 0,
          note: 'No doctors with this specialization are available.',
          message: `❌ No doctors available with specialization "${finalSpecialty}" on ${date}`
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
        isAvailable: slot.isAvailable,
        isBooked: !slot.isAvailable
      }));

      return res.status(200).json({
        success: true,
        date: date,
        availabilityStatus: formattedSlots.length > 0 ? 'available_and_confirmed' : 'no_availability',
        realTimeCheckPerformed: true,
        doctorCount: doctors.length,
        slotCount: formattedSlots.length,
        availableSlots: formattedSlots,
        specialty: finalSpecialty,
        note: formattedSlots.length > 0 ? 'Real-time availability confirmed. Each slot is reserved atomically upon booking.' : 'No slots currently available. Check again later or try another date.',
        message: formattedSlots.length > 0 
          ? `✅ Found ${formattedSlots.length} available slots from ${new Set(formattedSlots.map(s => s.doctorName)).size} doctor(s) in ${finalSpecialty}`
          : `❌ No available slots found for ${finalSpecialty} on ${date}`
      });
    }

    // No valid parameters
    return res.status(400).json({
      success: false,
      error: 'Either doctorId/preferredDoctorId or specialty is required',
      availabilityStatus: 'invalid_query'
    });

  } catch (error) {
    console.log('check slots error:', error);
    
    console.error('❌ Check Slots Availability Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      availableSlots: [],
      availabilityStatus: 'error'
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
    console.log('📥 Raw Request Body:', JSON.stringify(req.body, null, 2));
    
    let payload = req.body;
    if (req.body.input) payload = req.body.input;
    else if (req.body.parameters) payload = req.body.parameters;
    
    console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    
    const result = await handleCheckPatient(payload);
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
    console.log('📥 Raw Request Body:', JSON.stringify(req.body, null, 2));
    
    let payload = req.body;
    if (req.body.input) payload = req.body.input;
    else if (req.body.parameters) payload = req.body.parameters;
    
    console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    
    const result = await handleFindDoctor(payload);
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
 * @route   POST /api/vapi-tools/check-doctor-availability
 * @desc    Check if a doctor is available (VAPI Direct Call)
 * @access  Public (No Auth Required - Direct VAPI Integration)
 * @body    { doctorId, doctor_id }
 * @example
 * Request:
 * {
 *   "doctorId": "507f1f77bcf86cd799439012"
 * }
 * Response:
 * {
 *   "success": true,
 *   "available": true,
 *   "doctorId": "507f1f77bcf86cd799439012",
 *   "doctorName": "Dr. Alex Kumar",
 *   "specialization": "Cardiology",
 *   "status": "available",
 *   "message": "✅ Dr. Alex Kumar is available for bookings"
 * }
 */
router.post('/check-doctor-availability', async (req, res) => {
  try {
    console.log('📥 Raw Request Body:', JSON.stringify(req.body, null, 2));
    
    // Extract payload in multiple formats (for VAPI compatibility)
    let payload = req.body;
    
    // If parameters are nested in 'input' object
    if (req.body.input) {
      payload = req.body.input;
    }
    // If parameters are nested in 'parameters' object
    else if (req.body.parameters) {
      payload = req.body.parameters;
    }
    
    console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    
    const result = await handleCheckDoctorAvailability(payload);
    console.log('>>>>>>>>>>check dr available<<<<<<<<<<<<<<:', result);
    
    res.status(200).json({
      success: !result.error,
      data: result
    });
  } catch (error) {
    console.error('❌ Check Doctor Availability Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      available: false
    });
  }
});

/**
 * @route   POST /api/vapi-tools/list-doctors
 * @desc    Get list of all available doctors with their info (For new patients to discover doctors)
 * @access  Public (No Auth Required - Direct VAPI Integration)
 * @body    { specialization, specialty, limit }
 * @example
 * Request 1 - ALL DOCTORS:
 * {}
 * 
 * Request 2 - BY SPECIALIZATION:
 * {
 *   "specialization": "Cardiology",
 *   "limit": 20
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "totalDoctors": 5,
 *   "doctors": [
 *     {
 *       "doctorId": "507f1f77bcf86cd799439012",
 *       "name": "Dr. John Doe",
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "specialization": "Cardiology",
 *       "department": "Heart Care",
 *       "experience": "10 years",
 *       "city": "New York",
 *       "phone": "+1-9999999999",
 *       "email": "john@hospital.com",
 *       "licenseNumber": "MD1234",
 *       "isActive": true,
 *       "upcomingSlots": 5
 *     }
 *   ],
 *   "message": "✅ Found 5 available doctors"
 * }
 */
router.post('/list-doctors', async (req, res) => {
  try {
    console.log('📥 Raw List Doctors Request Body:', JSON.stringify(req.body, null, 2));
    
    // Extract payload in multiple formats (for VAPI compatibility)
    let payload = req.body;
    
    // If parameters are nested in 'input' object
    if (req.body.input) {
      payload = req.body.input;
    }
    // If parameters are nested in 'parameters' object
    else if (req.body.parameters) {
      payload = req.body.parameters;
    }
    
    console.log('📤 Extracted List Doctors Payload:', JSON.stringify(payload, null, 2));
    
    const result = await handleListDoctors(payload);
    res.status(200).json({
      success: !result.error,
      data: result
    });
  } catch (error) {
    console.error('❌ List Doctors Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      doctors: []
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
        doctorPhone: slot.doctorId.phone,
        isAvailable: slot.isAvailable,
        isBooked: !slot.isAvailable  // true = booked (disable), false = available (enable)
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
 * Create new appointment with ATOMIC slot booking to prevent double-booking
 * 
 * FLOW:
 * 1. Validate inputs and verify patient/doctor exist
 * 2. Create appointment in database
 * 3. Atomically update slot status (isAvailable=false, appointmentId linked)
 * 4. If slot already booked by another request -> return error with alternatives
 * 5. Return confirmation with real-time availability status
 */
async function handleBookAppointment(input) {
  try {
    const { patientId, patient_id, doctorId, doctor_id, date, time, symptoms, slotId } = input;
    const finalPatientId = patientId || patient_id;
    const finalDoctorId = doctorId || doctor_id;

    console.log('📝 Booking Appointment (Atomic):', {
      patientId: finalPatientId,
      doctorId: finalDoctorId,
      slotId,
      date,
      time,
      symptoms
    });

    // ========================================
    // STEP 1: VALIDATE INPUTS
    // ========================================
    if (!finalPatientId || !finalDoctorId || !date || !time) {
      return {
        error: 'Missing required fields: patientId, doctorId, date, time',
        availabilityStatus: 'validation_failed',
        details: {
          patientId: finalPatientId ? 'provided' : 'missing',
          doctorId: finalDoctorId ? 'provided' : 'missing',
          date: date ? 'provided' : 'missing',
          time: time ? 'provided' : 'missing'
        }
      };
    }

    // ========================================
    // STEP 2: VERIFY PATIENT & DOCTOR EXIST
    // ========================================
    const [patient, doctor] = await Promise.all([
      User.findById(finalPatientId),
      User.findById(finalDoctorId)
    ]);

    if (!patient) {
      return { 
        error: `Patient not found: ${finalPatientId}`,
        availabilityStatus: 'patient_not_found'
      };
    }

    if (!doctor) {
      return { 
        error: `Doctor not found: ${finalDoctorId}`,
        availabilityStatus: 'doctor_not_found'
      };
    }

    // ========================================
    // STEP 3: FIND & VALIDATE SLOT
    // ========================================
    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Build slot query
    const slotQuery = {
      doctorId: finalDoctorId,
      startTime: time, // Use startTime field as it stores HH:MM format
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 86400000)
      },
      isAvailable: true // CRITICAL: Only match available slots
    };

    if (slotId) {
      slotQuery._id = slotId; // If specific slot provided, verify it
    }

    const slot = await Slot.findOne(slotQuery).select('_id doctorId startTime date isAvailable appointmentId slotDuration fee location');

    if (!slot) {
      console.log('❌ Slot not found or already booked');
      
      // Provide helpful message with alternatives
      return {
        error: 'Selected slot is not available (may have been booked by another patient).',
        availabilityStatus: 'slot_unavailable',
        available: false,
        recommendation: 'Fetching alternative slots...',
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        requestedTime: time,
        requestedDate: date
      };
    }

    // ========================================
    // STEP 4: CREATE APPOINTMENT
    // ========================================
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

    const savedAppointment = await appointment.save();
    console.log('✅ Appointment Created:', savedAppointment._id);

    // ========================================
    // STEP 5: ATOMIC SLOT UPDATE (CRITICAL!)
    // ========================================
    // Use findByIdAndUpdate with atomic operation to prevent race condition
    // Only update slot if it's STILL available (isAvailable: true)
    const updatedSlot = await Slot.findByIdAndUpdate(
      slot._id,
      {
        $set: {
          isAvailable: false, // Mark as booked
          appointmentId: savedAppointment._id, // Link appointment
          updatedAt: new Date()
        }
      },
      { 
        new: true, // Return updated document
        runValidators: true,
        // This is crucial - only update if conditions are met
        conditions: { isAvailable: true } // Implicit: slot must still be available
      }
    );

    // If updatedSlot is null, slot was already booked by another request
    if (!updatedSlot) {
      console.log('⚠️  RACE CONDITION: Slot booked by another request!');
      
      // Appointment was created but slot couldn't be reserved
      // We need to cancel this appointment and notify agent
      await Appointment.findByIdAndUpdate(
        savedAppointment._id,
        { $set: { status: 'cancelled', cancellationReason: 'Slot booked by another user' } }
      );

      return {
        error: 'Slot was booked by another patient at the same time. Appointment cancelled.',
        availabilityStatus: 'race_condition_detected',
        available: false,
        availabilityConfirmed: false,
        recommendation: 'Please select another time slot',
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        requestedTime: time,
        requestedDate: date,
        message: '⚠️ Sorry! Another patient booked this slot just now. Would you like to try another time?'
      };
    }

    // ========================================
    // STEP 6: REAL-TIME AVAILABILITY CONFIRMATION
    // ========================================
    // Double-check that slot is now marked as unavailable
    const confirmationSlot = await Slot.findById(slot._id).select('isAvailable appointmentId');
    
    const slotConfirmedUnavailable = confirmationSlot && 
                                     !confirmationSlot.isAvailable && 
                                     confirmationSlot.appointmentId.toString() === savedAppointment._id.toString();

    console.log('✅ Appointment Confirmed:', {
      appointmentId: savedAppointment._id,
      slotReserved: slotConfirmedUnavailable,
      availabilityStatus: slotConfirmedUnavailable ? 'reserved' : 'warning'
    });

    // ========================================
    // STEP 7: RETURN SUCCESS RESPONSE
    // ========================================
    return {
      success: true,
      availabilityStatus: 'confirmed_and_reserved',
      availabilityConfirmed: true,
      slotReserved: true,
      appointmentId: savedAppointment._id,
      appointmentDate: appointmentDate.toISOString().split('T')[0],
      appointmentTime: time,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      doctorSpecialty: doctor.specialization,
      symptoms: symptoms || 'General Checkup',
      slotDetails: {
        duration: slot.slotDuration || 30,
        fee: slot.fee || 0,
        location: slot.location || 'Main Hospital'
      },
      confirmationMessage: `✅ Your appointment is CONFIRMED and RESERVED for ${appointmentDate.toLocaleDateString()} at ${time} with Dr. ${doctor.lastName}. The slot has been locked to prevent double-booking. You will receive an SMS and email confirmation shortly.`,
      doubleBookingPrevented: true
    };

  } catch (error) {
    console.error('❌ Book Appointment Error:', error.message);
    return {
      error: error.message,
      success: false,
      availabilityStatus: 'error'
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
 * Tool: Check Doctor Availability
 * Check if a specific doctor is available for bookings
 * Returns doctor details and availability status
 */
async function handleCheckDoctorAvailability(input) {
  try {
    const { doctorId, doctor_id } = input;
    console.log('<--------------doctor-id----------->', doctorId, doctor_id);
    
    const finalDoctorId = doctorId || doctor_id;

    // Validation
    if (!finalDoctorId) {
      console.log('❌ Doctor ID not provided');
      return {
        error: 'Doctor ID is required',
        available: false,
        message: 'Please provide a valid doctor ID'
      };
    }

    console.log('👨‍⚕️  Checking Doctor Availability:', { doctorId: finalDoctorId });

    // Find doctor in User collection
    const doctor = await User.findById(finalDoctorId).select(
      '_id firstName lastName specialization email phone isActive department licenseNumber experience city role'
    );

    // Doctor not found
    if (!doctor || doctor.role !== 'doctor') {
      console.log('❌ Doctor Not Found:', finalDoctorId);
      return {
        error: `Doctor not found with ID: ${finalDoctorId}`,
        available: false,
        doctorId: finalDoctorId,
        message: '❌ This doctor does not exist in the system'
      };
    }

    // Check if doctor is active
    const isAvailable = doctor.isActive === true;

    console.log(`✅ Doctor Availability Check: ${doctor.firstName} ${doctor.lastName} - ${isAvailable ? 'ACTIVE' : 'INACTIVE'}`);

    // Get count of upcoming slots for this doctor
    const upcomingSlots = await Slot.countDocuments({
      doctorId: finalDoctorId,
      date: { $gte: new Date() },
      isAvailable: true
    });

    // Get total appointments in next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingAppointments = await Appointment.countDocuments({
      doctorId: finalDoctorId,
      appointmentDate: {
        $gte: new Date(),
        $lte: nextWeek
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    return {
      success: true,
      available: isAvailable,
      doctorId: doctor._id,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialization: doctor.specialization,
      department: doctor.department || 'Not specified',
      email: doctor.email,
      phone: doctor.phone,
      experience: doctor.experience ? `${doctor.experience} years` : 'Not specified',
      licenseNumber: doctor.licenseNumber || 'Not specified',
      city: doctor.city || 'Not specified',
      status: isAvailable ? 'available' : 'unavailable',
      availabilityStatus: isAvailable ? 'active' : 'inactive',
      upcomingSlots: upcomingSlots,
      upcomingAppointments: upcomingAppointments,
      acceptingNewPatients: isAvailable,
      message: isAvailable
        ? `✅ Dr. ${doctor.lastName} is available for bookings. ${upcomingSlots} time slots available in the next 7 days.`
        : `❌ Dr. ${doctor.lastName} is currently unavailable for new bookings`,
      details: {
        isActive: isAvailable,
        hasUpcomingSlots: upcomingSlots > 0,
        scheduleBusy: upcomingAppointments > 5 ? 'busy' : 'available'
      }
    };

  } catch (error) {
    console.error('❌ Check Doctor Availability Error:', error.message);
    return {
      error: error.message,
      available: false,
      success: false
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

/**
 * Tool: List All Doctors
 * Get list of all available doctors (helpful for new patients to discover doctors)
 * Optionally filter by specialization
 */
async function handleListDoctors(input) {
  try {
    const { specialization, specialty, limit = 50 } = input;
    const searchSpecialty = specialization || specialty;

    console.log('📋 Listing All Doctors:', {
      specialization: searchSpecialty,
      limit
    });

    // Build query for active doctors only
    let query = {
      role: 'doctor',
      isActive: true
    };

    // Optional: Filter by specialization
    if (searchSpecialty) {
      query.specialization = { $regex: searchSpecialty, $options: 'i' };
    }

    // Fetch all active doctors
    const doctors = await User.find(query)
      .select('_id firstName lastName specialization department phone email licenseNumber experience city isActive')
      .limit(limit)
      .sort({ firstName: 1 });

    if (doctors.length === 0) {
      console.log('ℹ️ No doctors found');
      return {
        success: true,
        error: null,
        totalDoctors: 0,
        doctors: [],
        message: searchSpecialty 
          ? `No doctors found with specialization "${searchSpecialty}"`
          : 'No doctors available in the system'
      };
    }

    console.log(`✅ Found ${doctors.length} available doctors`);

    // Enhance doctor list with upcoming slots count
    const doctorsList = await Promise.all(doctors.map(async (doc) => {
      // Count upcoming slots for each doctor
      const upcomingSlots = await Slot.countDocuments({
        doctorId: doc._id,
        date: { $gte: new Date() },
        isAvailable: true
      });

      return {
        doctorId: doc._id,
        name: `Dr. ${doc.firstName} ${doc.lastName}`,
        firstName: doc.firstName,
        lastName: doc.lastName,
        specialization: doc.specialization || 'Not specified',
        department: doc.department || 'Not specified',
        experience: doc.experience ? `${doc.experience} years` : 'Not specified',
        city: doc.city || 'Not specified',
        phone: doc.phone || 'Not available',
        email: doc.email || 'Not available',
        licenseNumber: doc.licenseNumber || 'Not specified',
        isActive: doc.isActive,
        upcomingSlots: upcomingSlots,
        availability: upcomingSlots > 0 ? 'Has slots available' : 'No slots currently available',
        status: 'Available for booking'
      };
    }));

    return {
      success: true,
      error: null,
      totalDoctors: doctorsList.length,
      doctors: doctorsList,
      filter: searchSpecialty ? `Specialization: ${searchSpecialty}` : 'All specializations',
      message: searchSpecialty
        ? `✅ Found ${doctorsList.length} available ${searchSpecialty} doctor(s)`
        : `✅ Found ${doctorsList.length} available doctors in total`
    };
  } catch (error) {
    console.error('❌ List Doctors Error:', error.message);
    return {
      error: error.message,
      success: false,
      totalDoctors: 0,
      doctors: []
    };
  }
}

module.exports = router;
