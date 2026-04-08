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

      case 'register_patient':
        response = await handleRegisterPatient(toolUse.input);
        break;

      default:
        response = {
          error: `Unknown tool: ${toolUse?.toolName}`,
          availableTools: ['check_patient', 'get_available_slots', 'book_appointment', 'check_symptoms', 'find_doctor', 'register_patient']
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
    console.log('📥 Raw Slots Request Body:', JSON.stringify(req.body, null, 2));
    
    // 1. Extract from VAPI webhook structure (VAPI tool-calls format)
    let toolCallId = null;
    let payload = req.body;
    
    if (req.body?.message?.toolCallList?.[0]) {
      // VAPI webhook format
      const toolCall = req.body.message.toolCallList[0];
      toolCallId = toolCall?.id || toolCall?.toolCallId;
      payload = toolCall?.function?.arguments || {};
      console.log('✅ VAPI Webhook Format Detected');
      console.log('🔧 Extracted toolCallId:', toolCallId);
      console.log('📤 Extracted Arguments:', JSON.stringify(payload, null, 2));
    }
    // 2. Legacy format: parameters nested in 'input' object
    else if (req.body?.input) {
      payload = req.body.input;
      console.log('✅ Input Object Format Detected');
    }
    // 3. Legacy format: parameters nested in 'parameters' object
    else if (req.body?.parameters) {
      payload = req.body.parameters;
      console.log('✅ Parameters Object Format Detected');
    }
    
    const { 
      doctorId, 
      doctor_id, 
      date, 
      specialty, 
      specialization, 
      limit = 10,
      includeAlternatives = true 
    } = payload;

    // Validation
    if (!date) {
      const errorResult = {
        success: false,
        error: 'Date is required (format: YYYY-MM-DD)',
        availabilityStatus: 'invalid_query'
      };
      
      if (toolCallId) {
        return res.status(200).json({
          results: [{
            toolCallId: toolCallId,
            result: errorResult
          }]
        });
      }
      return res.status(400).json(errorResult);
    }

    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(searchDate.getTime() + 86400000);

    const finalDoctorId = doctorId || doctor_id;
    const finalSpecialty = specialty || specialization;

    console.log('📅 VAPI Check Slots Availability:', {
      date,
      doctorId: finalDoctorId,
      specialty: finalSpecialty,
      limit
    });

    // ============================================
    // SCENARIO 1: Check specific doctor's slots by ID
    // ============================================
    if (finalDoctorId) {
      const doctor = await User.findById(finalDoctorId).select(
        'firstName lastName specialization phone email role isActive'
      );

      if (!doctor || doctor.role !== 'doctor') {
        const errorResult = {
          success: false,
          error: `Doctor not found with ID: ${finalDoctorId}`,
          availabilityStatus: 'doctor_not_found'
        };
        
        if (toolCallId) {
          return res.status(200).json({
            results: [{
              toolCallId: toolCallId,
              result: errorResult
            }]
          });
        }
        return res.status(404).json(errorResult);
      }

      console.log(`🎯 Checking slots for doctor: ${doctor.firstName} ${doctor.lastName}`);

      // Get doctor's slots
      const doctorSlots = await Slot.find({
        doctorId: finalDoctorId,
        date: {
          $gte: searchDate,
          $lt: nextDay
        },
        isAvailable: true
      })
        .populate('doctorId', 'firstName lastName specialization phone email')
        .sort({ startTime: 1 })
        .limit(limit);

      // Format slots
      const formattedSlots = doctorSlots.map(slot => ({
        slotId: slot._id.toString(),
        doctorId: slot.doctorId._id.toString(),
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

      const slotResult = {
        success: true,
        availabilityStatus: formattedSlots.length > 0 ? 'available' : 'no_availability',
        date: date,
        doctorId: finalDoctorId,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        specialty: doctor.specialization,
        slotCount: formattedSlots.length,
        availableSlots: formattedSlots,
        message: formattedSlots.length > 0 
          ? `✅ Found ${formattedSlots.length} available slots with ${doctor.firstName} ${doctor.lastName} on ${date}`
          : `❌ No available slots with ${doctor.firstName} ${doctor.lastName} on ${date}`
      };
      
      if (toolCallId) {
        return res.status(200).json({
          results: [{
            toolCallId: toolCallId,
            result: slotResult
          }]
        });
      }
      return res.status(200).json({
        success: true,
        result: slotResult
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
        const errorResult = {
          success: true,
          availabilityStatus: 'no_doctors',
          date: date,
          slotCount: 0,
          availableSlots: [],
          message: `❌ No doctors available with specialization "${finalSpecialty}"`
        };
        
        if (toolCallId) {
          return res.status(200).json({
            results: [{
              toolCallId: toolCallId,
              result: errorResult
            }]
          });
        }
        return res.status(200).json(errorResult);
      }

      const slots = await Slot.find({
        doctorId: { $in: doctorIds },
        date: {
          $gte: searchDate,
          $lt: nextDay
        },
        isAvailable: true
      })
        .populate('doctorId', 'firstName lastName specialization phone email')
        .sort({ startTime: 1 })
        .limit(limit);

      const formattedSlots = slots.map(slot => ({
        slotId: slot._id.toString(),
        doctorId: slot.doctorId._id.toString(),
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

      const slotResult = {
        success: true,
        availabilityStatus: formattedSlots.length > 0 ? 'available' : 'no_availability',
        date: date,
        specialty: finalSpecialty,
        slotCount: formattedSlots.length,
        availableSlots: formattedSlots,
        message: formattedSlots.length > 0
          ? `✅ Found ${formattedSlots.length} available slots from ${doctor.firstName} ${doctor.lastName} in ${finalSpecialty} on ${date}`
          : `❌ No available slots in ${finalSpecialty} on ${date}`
      };
      
      if (toolCallId) {
        return res.status(200).json({
          results: [{
            toolCallId: toolCallId,
            result: slotResult
          }]
        });
      }
      return res.status(200).json({
        success: true,
        result: slotResult
      });
    }

    // No valid parameters
    const errorResult = {
      success: false,
      error: 'Either doctorId or specialty is required',
      availabilityStatus: 'invalid_query'
    };
    
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: errorResult
        }]
      });
    }
    return res.status(400).json(errorResult);

  } catch (error) {
    console.error('❌ Check Slots Availability Error:', error.message);
    
    const errorResult = {
      success: false,
      error: error.message,
      availableSlots: [],
      availabilityStatus: 'error'
    };
    
    const toolCallId = req.body?.message?.toolCallList?.[0]?.id;
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: errorResult
        }]
      });
    }
    return res.status(500).json(errorResult);
  }
});

/**
 * @route   POST /api/vapi-tools/check-patient
 * @desc    Check if patient exists (VAPI Direct Call)
 * @access  Public (No Auth Required - Direct VAPI Integration)
 * @body    { phone, email, phoneNumber }
 * @example
 * Request:
 * {
 *   "phone": "1234567890"
 * }
 * or
 * {
 *   "phoneNumber": "1234567890"
 * }
 * or
 * {
 *   "email": "john@example.com"
 * }
 * Response - Patient Found:
 * {
 *   "success": true,
 *   "data": {
 *     "found": true,
 *     "isExisting": true,
 *     "patientId": "507f1f77bcf86cd799439012",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "phone": "1234567890",
 *     "dateOfBirth": "1990-05-15",
 *     "gender": "male",
 *     "message": "Patient John Doe found in system"
 *   }
 * }
 * Response - Patient Not Found:
 * {
 *   "success": true,
 *   "data": {
 *     "found": false,
 *     "isExisting": false,
 *     "isNew": true,
 *     "message": "Patient not found. Treat as new patient and collect details."
 *   }
 * }
 */
/**
 * @route   POST /api/vapi-tools/check-patient
 * @desc    Check if patient exists (VAPI Webhook)
 * @access  Public (No Auth Required - VAPI Tool Call)
 * 
 * VAPI sends webhook in this format:
 * {
 *   "message": {
 *     "type": "tool-calls",
 *     "toolCallList": [{
 *       "id": "toolcall_abc123",
 *       "function": {
 *         "name": "check-patient",
 *         "arguments": { "phone": "9098765432" }
 *       }
 *     }]
 *   }
 * }
 * 
 * Response format:
 * {
 *   "results": [{
 *     "toolCallId": "toolcall_abc123",
 *     "result": { "success": true, "found": true, ... }
 *   }]
 * }
 */
router.post('/check-patient', async (req, res) => {
  try {
    console.log('📥 Raw Request Body:', JSON.stringify(req.body, null, 2));
    
    // Extract toolCallId and arguments from VAPI webhook structure
    const toolCall = req.body?.message?.toolCallList?.[0];
    const toolCallId = toolCall?.id || toolCall?.toolCallId || 'unknown-tool-call';
    const functionArgs = toolCall?.function?.arguments || {};

    console.log('🔧 Extracted toolCallId:', toolCallId);
    console.log('📤 Extracted Arguments:', JSON.stringify(functionArgs, null, 2));

    // Handle fallback format (direct call - not from VAPI webhook)
    let payload = functionArgs;
    
    // If no function arguments, try alternative formats
    if (!payload || Object.keys(payload).length === 0) {
      if (req.body.input) {
        payload = req.body.input;
        console.log('✓ Using VAPI input format (fallback)');
      } else if (req.body.parameters) {
        payload = req.body.parameters;
        console.log('✓ Using parameters format (fallback)');
      } else if (req.body.phone || req.body.email) {
        payload = req.body;
        console.log('✓ Using direct format (fallback)');
      }
    }

    console.log('📤 Final Extracted Payload:', JSON.stringify(payload, null, 2));

    // Validation
    if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
      console.warn('⚠️ No arguments found in request');
      return res.status(200).json({
        results: [
          {
            toolCallId: toolCallId,
            result: {
              success: false,
              error: 'No patient data provided',
              found: false,
              isExisting: false
            }
          }
        ]
      });
    }

    // Call the handler to check patient
    const result = await handleCheckPatient(payload);

    console.log('✅ Check Patient Result:', JSON.stringify(result, null, 2));

    // Return response in VAPI-required format
    return res.status(200).json({
      results: [
        {
          toolCallId: toolCallId,
          result: result
        }
      ]
    });

  } catch (error) {
    console.error('❌ Check Patient Error:', error.message);
    console.error('❌ Stack:', error.stack);
    
    const toolCallId = req.body?.message?.toolCallList?.[0]?.id || 'unknown-tool-call';
    
    return res.status(200).json({
      results: [
        {
          toolCallId: toolCallId,
          result: {
            success: false,
            error: error.message,
            found: false,
            isExisting: false
          }
        }
      ]
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
    
    // 1. Extract from VAPI webhook structure (VAPI tool-calls format)
    let toolCallId = null;
    let payload = req.body;
    
    if (req.body?.message?.toolCallList?.[0]) {
      // VAPI webhook format
      const toolCall = req.body.message.toolCallList[0];
      toolCallId = toolCall?.id || toolCall?.toolCallId;
      payload = toolCall?.function?.arguments || {};
      console.log('✅ VAPI Webhook Format Detected');
      console.log('🔧 Extracted toolCallId:', toolCallId);
      console.log('📤 Extracted Arguments:', JSON.stringify(payload, null, 2));
    }
    // 2. Legacy format: parameters nested in 'input' object
    else if (req.body?.input) {
      payload = req.body.input;
      console.log('✅ Input Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    // 3. Legacy format: parameters nested in 'parameters' object
    else if (req.body?.parameters) {
      payload = req.body.parameters;
      console.log('✅ Parameters Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    // 4. Direct call format (all parameters at root)
    else if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is empty. Send: {"specialization":"Cardiology"} or {"doctorName":"John"}'
      });
    }
    
    const result = await handleFindDoctor(payload);
    
    // Return VAPI format if this was a VAPI webhook call
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: result
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('❌ Find Doctor Error:', error.message);
    
    // If this was a VAPI webhook call, return error in VAPI format
    const toolCallId = req.body?.message?.toolCallList?.[0]?.id;
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: {
            error: error.message,
            found: false,
            doctors: []
          }
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(500).json({
      success: false,
      result: {
        error: error.message
      }
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
    
    // 1. Extract from VAPI webhook structure (VAPI tool-calls format)
    let toolCallId = null;
    let payload = req.body;
    
    if (req.body?.message?.toolCallList?.[0]) {
      // VAPI webhook format
      const toolCall = req.body.message.toolCallList[0];
      toolCallId = toolCall?.id || toolCall?.toolCallId;
      payload = toolCall?.function?.arguments || {};
      console.log('✅ VAPI Webhook Format Detected');
      console.log('🔧 Extracted toolCallId:', toolCallId);
      console.log('📤 Extracted Arguments:', JSON.stringify(payload, null, 2));
    }
    // 2. Legacy format: parameters nested in 'input' object
    else if (req.body?.input) {
      payload = req.body.input;
      console.log('✅ Input Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    // 3. Legacy format: parameters nested in 'parameters' object
    else if (req.body?.parameters) {
      payload = req.body.parameters;
      console.log('✅ Parameters Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is empty. Send: {"doctorId":"doctor_mongo_id"}'
      });
    }
    
    console.log('📤 Final Extracted Payload:', JSON.stringify(payload, null, 2));
    
    const result = await handleCheckDoctorAvailability(payload);
    console.log('>>>>>>>>>>check dr available<<<<<<<<<<<<<<:', result);
    
    // Return VAPI format if this was a VAPI webhook call
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: result
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(200).json({
      success: !result.error,
      result: result
    });
  } catch (error) {
    console.error('❌ Check Doctor Availability Error:', error.message);
    
    // If this was a VAPI webhook call, return error in VAPI format
    const toolCallId = req.body?.message?.toolCallList?.[0]?.id;
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: {
            error: error.message,
            available: false
          }
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(500).json({
      success: false,
      result: {
        error: error.message,
        available: false
      }
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

/**
 * @route   POST /api/vapi-tools/book-appointment
 * @desc    Book appointment for patient via VAPI (NO AUTH REQUIRED - for phone/IVR bookings)
 * @access  Public (No Token Required - Direct VAPI/Phone Integration)
 * @body    { slotId, doctorId, date, time, patientPhone, patientId, symptoms }
 * @example
 * VAPI Webhook Request:
 * {
 *   "message": {
 *     "type": "tool-calls",
 *     "toolCallList": [{
 *       "id": "toolcall_book123",
 *       "function": {
 *         "name": "book-appointment",
 *         "arguments": {
 *           "slotId": "507f1f77bcf86cd799439011",
 *           "doctorId": "507f1f77bcf86cd799439012",
 *           "date": "2024-04-15",
 *           "time": "10:00",
 *           "patientPhone": "9098765432",
 *           "symptoms": "Chest pain"
 *         }
 *       }
 *     }]
 *   }
 * }
 * 
 * OR with existing patientId:
 * {
 *   "slotId": "507f1f77bcf86cd799439011",
 *   "doctorId": "507f1f77bcf86cd799439012",
 *   "date": "2024-04-15",
 *   "time": "10:00",
 *   "patientId": "507f77bcf86cd799439015",
 *   "symptoms": "Chest pain"
 * }
 * 
 * Response:
 * {
 *   "results": [{
 *     "toolCallId": "toolcall_book123",
 *     "result": {
 *       "success": true,
 *       "appointmentId": "507f1f77bcf86cd799439020",
 *       "status": "scheduled",
 *       "patientName": "John Doe",
 *       "patientPhone": "9098765432",
 *       "doctorName": "Dr. John Doe",
 *       "date": "2024-04-15",
 *       "time": "10:00",
 *       "message": "✅ Appointment confirmed! Your appointment is scheduled."
 *     }
 *   }]
 * }
 */
router.post('/book-appointment', async (req, res) => {
  try {
    console.log('📥 Raw Book Appointment Request Body:', JSON.stringify(req.body, null, 2));
    
    // 1. Extract from VAPI webhook structure (VAPI tool-calls format)
    let toolCallId = null;
    let payload = req.body;
    
    if (req.body?.message?.toolCallList?.[0]) {
      // VAPI webhook format
      const toolCall = req.body.message.toolCallList[0];
      toolCallId = toolCall?.id || toolCall?.toolCallId;
      payload = toolCall?.function?.arguments || {};
      console.log('✅ VAPI Webhook Format Detected');
      console.log('🔧 Extracted toolCallId:', toolCallId);
      console.log('📤 Extracted Arguments:', JSON.stringify(payload, null, 2));
    }
    // 2. Legacy format: parameters nested in 'input' object
    else if (req.body?.input) {
      payload = req.body.input;
      console.log('✅ Input Object Format Detected');
    }
    // 3. Legacy format: parameters nested in 'parameters' object
    else if (req.body?.parameters) {
      payload = req.body.parameters;
      console.log('✅ Parameters Object Format Detected');
    }

    const result = await handleBookAppointmentVapi(payload);
    
    // Return VAPI format if this was a VAPI webhook call
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: result
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(result.error ? 400 : 200).json({
      success: !result.error,
      result: result
    });
  } catch (error) {
    console.error('❌ Book Appointment Error:', error.message);
    
    // If this was a VAPI webhook call, return error in VAPI format
    const toolCallId = req.body?.message?.toolCallList?.[0]?.id;
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: {
            success: false,
            error: error.message,
            status: 'error'
          }
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(500).json({
      success: false,
      result: {
        error: error.message,
        status: 'error'
      }
    });
  }
});

router.post('/list-doctors', async (req, res) => {
  try {
    console.log('📥 Raw List Doctors Request Body:', JSON.stringify(req.body, null, 2));
    
    // 1. Extract from VAPI webhook structure (VAPI tool-calls format)
    let toolCallId = null;
    let payload = req.body;
    
    if (req.body?.message?.toolCallList?.[0]) {
      // VAPI webhook format
      const toolCall = req.body.message.toolCallList[0];
      toolCallId = toolCall?.id || toolCall?.toolCallId;
      payload = toolCall?.function?.arguments || {};
      console.log('✅ VAPI Webhook Format Detected');
      console.log('🔧 Extracted toolCallId:', toolCallId);
      console.log('📤 Extracted Arguments:', JSON.stringify(payload, null, 2));
    }
    // 2. Legacy format: parameters nested in 'input' object
    else if (req.body?.input) {
      payload = req.body.input;
      console.log('✅ Input Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    // 3. Legacy format: parameters nested in 'parameters' object
    else if (req.body?.parameters) {
      payload = req.body.parameters;
      console.log('✅ Parameters Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    
    console.log('📤 Final Extracted Payload:', JSON.stringify(payload, null, 2));
    
    const result = await handleListDoctors(payload);
    
    // Return VAPI format if this was a VAPI webhook call
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: {
            success: true,
            result: result
          }
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(200).json({
      success: !result.error,
      result: result
    });
  } catch (error) {
    console.error('❌ List Doctors Error:', error.message);
    
    // If this was a VAPI webhook call, return error in VAPI format
    const toolCallId = req.body?.message?.toolCallList?.[0]?.id;
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: {
            success: false,
            result: {
              error: error.message,
              doctors: [],
              totalDoctors: 0
            }
          }
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(500).json({
      success: false,
      result: {
        error: error.message,
        doctors: []
      }
    });
  }
});

/**
 * @route   POST /api/vapi-tools/register-patient
 * @desc    Register new patient from VAPI agent (VAPI Direct Call)
 * @access  Public (No Auth Required - Direct VAPI Integration)
 * @body    { firstName, lastName, email, phone, password, age, medicalHistory, gender, dateOfBirth }
 * @example
 * Request:
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john@example.com",
 *   "phone": "1234567890",
 *   "age": 30,
 *   "gender": "male",
 *   "medicalHistory": "None"
 * }
 * Response:
 * {
 *   "success": true,
 *   "patientId": "507f1f77bcf86cd799439012",
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "phone": "1234567890",
 *   "role": "patient",
 *   "registered": true,
 *   "message": "✅ Patient registered successfully"
 * }
 */
router.post('/register-patient', async (req, res) => {
  try {
    console.log('📥 Raw Request Body:', JSON.stringify(req.body, null, 2));
    
    // 1. Extract from VAPI webhook structure (VAPI tool-calls format)
    let toolCallId = null;
    let payload = req.body;
    
    if (req.body?.message?.toolCallList?.[0]) {
      // VAPI webhook format
      const toolCall = req.body.message.toolCallList[0];
      toolCallId = toolCall?.id || toolCall?.toolCallId;
      payload = toolCall?.function?.arguments || {};
      console.log('✅ VAPI Webhook Format Detected');
      console.log('🔧 Extracted toolCallId:', toolCallId);
      console.log('📤 Extracted Arguments:', JSON.stringify(payload, null, 2));
    }
    // 2. Legacy format: parameters nested in 'input' object
    else if (req.body?.input) {
      payload = req.body.input;
      console.log('✅ Input Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    // 3. Legacy format: parameters nested in 'parameters' object
    else if (req.body?.parameters) {
      payload = req.body.parameters;
      console.log('✅ Parameters Object Format Detected');
      console.log('📤 Extracted Payload:', JSON.stringify(payload, null, 2));
    }
    
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body is empty. Send: {"firstName":"John","lastName":"Doe","email":"john@example.com","phone":"1234567890"}'
      });
    }
    
    console.log('📤 Final Extracted Payload:', JSON.stringify(payload, null, 2));
    
    const result = await handleRegisterPatient(payload);
    
    // Return VAPI format if this was a VAPI webhook call
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: result
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(result.error ? 400 : 201).json({
      success: !result.error,
      result: result
    });
  } catch (error) {
    console.error('❌ Register Patient Error:', error.message);
    
    // If this was a VAPI webhook call, return error in VAPI format
    const toolCallId = req.body?.message?.toolCallList?.[0]?.id;
    if (toolCallId) {
      return res.status(200).json({
        results: [{
          toolCallId: toolCallId,
          result: {
            success: false,
            error: error.message
          }
        }]
      });
    }
    
    // Return legacy format for direct calls
    res.status(500).json({
      success: false,
      result: {
        error: error.message
      }
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
    // Log ALL input properties to debug VAPI payload format
    console.log('📥 handleCheckPatient Input Keys:', Object.keys(input));
    console.log('📥 handleCheckPatient Full Input:', JSON.stringify(input, null, 2));

    // Extract phone from multiple possible property names (VAPI might send differently)
    const phoneProperty = input.phone || input.phoneNumber || input.phone_number || 
                          input.patientPhone || input.patient_phone || input.contactPhone || 
                          input.contact_phone || input.mobileNumber || input.mobile_number;
    
    // Extract email from multiple possible property names
    const emailProperty = input.email || input.userEmail || input.user_email || 
                          input.patientEmail || input.patient_email;

    const searchPhone = phoneProperty?.toString().trim();
    const searchEmail = emailProperty?.toString().toLowerCase().trim();

    console.log('🔍 Extracted Search Params:', { searchPhone, searchEmail });

    let query = { role: 'patient' };

    if (searchPhone) {
      // Normalize phone number - remove all non-digits for better matching
      const normalized = searchPhone.replace(/\D/g, '');
      console.log('📱 Phone Search - Original:', searchPhone, 'Normalized:', normalized);
      
      // Search by exact match or partial match with regex
      query.$or = [
        { phone: searchPhone },                                  // Exact match
        { phone: normalized },                                   // Normalized exact match
        { phone: { $regex: normalized, $options: 'i' } }        // Partial regex match
      ];
    }

    if (searchEmail) {
      // Handle email separately
      if (query.$or) {
        // If phone is provided, add email to $or conditions
        query.$or.push({ email: searchEmail });
      } else {
        // Only email provided
        query.email = searchEmail;
      }
    }

    console.log('🔎 Final Query:', JSON.stringify(query, null, 2));

    const patient = await User.findOne(query).select(
      '_id firstName lastName email phone dateOfBirth gender emergencyContact role'
    );

    console.log('📊 Database Query Result:', patient ? 'FOUND' : 'NOT FOUND');
    if (patient) {
      console.log('✅ Patient Located:', {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        phone: patient.phone
      });
    }

    if (patient) {
      return {
        found: true,
        isExisting: true,
        patientId: patient._id.toString(),
        name: `${patient.firstName} ${patient.lastName}`,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        role: patient.role,
        message: `Found existing patient: ${patient.firstName} ${patient.lastName}`
      };
    } else {
      console.log('ℹ️ Patient Not Found - Treat as New Patient');
      return {
        found: false,
        isExisting: false,
        isNew: true,
        message: 'Patient not found in system. Proceed with new patient registration.',
        suggestAction: 'register'
      };
    }
  } catch (error) {
    console.error('❌ Check Patient Error:', error.message);
    console.error('❌ Error Stack:', error.stack);
    return {
      error: error.message,
      found: false,
      isExisting: false
    };
  }
}

/**
 * Tool: Book Appointment VAPI Version
 * Books appointment by slotId OR (doctorId + date + time)
 * Supports patient identification by patientId OR patientPhone
 * For voice/phone bookings where auth token is not available
 */
async function handleBookAppointmentVapi(input) {
  try {
    const { 
      slotId, 
      doctorId, 
      doctor_id, 
      date, 
      time, 
      patientId, 
      patient_id, 
      patientPhone,
      patient_phone,
      symptoms, 
      notes 
    } = input;

    const finalDoctorId = doctorId || doctor_id;
    const finalPatientId = patientId || patient_id;
    const finalPatientPhone = patientPhone || patient_phone;

    console.log('📞 VAPI Book Appointment:', {
      slotId,
      doctorId: finalDoctorId,
      date,
      time,
      patientId: finalPatientId,
      patientPhone: finalPatientPhone,
      symptoms
    });

    // ========================================
    // STEP 1: VALIDATE INPUTS
    // ========================================
    if (!finalDoctorId || !date || !time) {
      return {
        success: false,
        error: 'Missing required fields: doctorId, date, time',
        status: 'validation_failed'
      };
    }

    if (!finalPatientId && !finalPatientPhone) {
      return {
        success: false,
        error: 'Either patientId or patientPhone required',
        status: 'validation_failed'
      };
    }

    // ========================================
    // STEP 2: GET PATIENT (by ID or Phone)
    // ========================================
    let patient;

    if (finalPatientId) {
      // Look up by ID
      patient = await User.findById(finalPatientId).select('_id firstName lastName email phone role');
    } else if (finalPatientPhone) {
      // Look up by phone
      const cleanPhone = finalPatientPhone.replace(/\D/g, '');
      patient = await User.findOne({
        role: 'patient',
        phone: { $regex: cleanPhone }
      }).select('_id firstName lastName email phone role');

      if (!patient) {
        console.log('ℹ️  Patient not found by phone. Creating new patient record...');
        // Patient doesn't exist - will be created with minimal info
        // This is common for walk-in patients via IVR
        return {
          success: false,
          error: `Patient not found with phone: ${finalPatientPhone}. Please check patient is registered.`,
          status: 'patient_not_found',
          suggestion: 'Patient must be registered before booking via phone'
        };
      }
    }

    if (!patient) {
      return {
        success: false,
        error: 'Patient not found',
        status: 'patient_not_found'
      };
    }

    // ========================================
    // STEP 3: VERIFY DOCTOR EXISTS
    // ========================================
    const doctor = await User.findById(finalDoctorId).select('_id firstName lastName specialization email phone role');

    if (!doctor || doctor.role !== 'doctor') {
      return {
        success: false,
        error: `Doctor not found with ID: ${finalDoctorId}`,
        status: 'doctor_not_found'
      };
    }

    // ========================================
    // STEP 4: FIND & VALIDATE SLOT
    // ========================================
    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    let slot;

    // If slotId is provided, query by ID first (it's the unique identifier)
    if (slotId) {
      console.log('🔍 Querying slot by ID:', slotId);
      slot = await Slot.findById(slotId).select('_id doctorId startTime date isAvailable slotDuration fee location');
      
      if (!slot) {
        console.log('❌ Slot not found with ID:', slotId);
        return {
          success: false,
          error: `Slot with ID ${slotId} not found`,
          status: 'slot_not_found',
          slotId: slotId
        };
      }

      // Validate slot belongs to the right doctor
      if (slot.doctorId.toString() !== finalDoctorId.toString()) {
        console.log('❌ Slot belongs to different doctor');
        return {
          success: false,
          error: `Slot belongs to a different doctor`,
          status: 'wrong_doctor',
          slotDoctorId: slot.doctorId,
          requestedDoctorId: finalDoctorId
        };
      }

      // Validate slot is still available
      if (!slot.isAvailable) {
        console.log('❌ Slot already booked');
        return {
          success: false,
          error: 'Selected slot is no longer available (already booked)',
          status: 'slot_unavailable',
          slotId: slotId,
          doctorName: `${doctor.firstName} ${doctor.lastName}`
        };
      }

      console.log('✅ Slot found by ID and validated');
    } else {
      // No slotId provided - build query by doctor + date + time
      const slotQuery = {
        doctorId: finalDoctorId,
        startTime: time,
        date: {
          $gte: new Date(date),
          $lt: new Date(new Date(date).getTime() + 86400000)
        },
        isAvailable: true
      };

      console.log('🔍 Querying slot by doctor + date + time:', {
        doctorId: finalDoctorId,
        startTime: time,
        date: date
      });

      slot = await Slot.findOne(slotQuery).select('_id doctorId startTime date isAvailable slotDuration fee location');

      if (!slot) {
        console.log('❌ No available slot found for the criteria');
        return {
          success: false,
          error: 'No available slot found for the requested doctor, date and time',
          status: 'slot_unavailable',
          doctorName: `${doctor.firstName} ${doctor.lastName}`,
          requestedTime: time,
          requestedDate: date
        };
      }

      console.log('✅ Slot found by criteria');
    }

    // ========================================
    // STEP 5: CREATE APPOINTMENT
    // ========================================
    const appointment = new Appointment({
      patientId: patient._id,
      doctorId: finalDoctorId,
      appointmentDate: appointmentDate,
      appointmentTime: time,
      symptoms: symptoms || 'General Checkup',
      status: 'scheduled',
      notes: notes || 'Booked via VAPI Phone System',
      bookedVia: 'voice_agent',
      bookedAt: new Date()
    });

    const savedAppointment = await appointment.save();
    console.log('✅ Appointment Created:', savedAppointment._id);

    // ========================================
    // STEP 6: ATOMIC SLOT UPDATE (CRITICAL!)
    // ========================================
    const updatedSlot = await Slot.findByIdAndUpdate(
      slot._id,
      {
        $set: {
          isAvailable: false,
          appointmentId: savedAppointment._id,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    // If updatedSlot is null, slot was already booked
    if (!updatedSlot) {
      console.log('⚠️  RACE CONDITION: Slot booked by another patient!');
      
      // Cancel the appointment
      await Appointment.findByIdAndUpdate(
        savedAppointment._id,
        { 
          $set: { 
            status: 'cancelled', 
            cancellationReason: 'Slot booked by another user' 
          } 
        }
      );

      return {
        success: false,
        error: 'Slot was booked by another patient. Appointment cancelled.',
        status: 'race_condition',
        availability: false,
        suggestion: 'Please select another time slot'
      };
    }

    console.log('✅ Slot marked as booked');

    // ========================================
    // STEP 7: RETURN SUCCESS RESPONSE
    // ========================================
    return {
      success: true,
      appointmentId: savedAppointment._id.toString(),
      status: 'scheduled',
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      doctorSpecialization: doctor.specialization,
      doctorPhone: doctor.phone,
      date: date,
      time: time,
      symptoms: symptoms || 'General Checkup',
      fee: slot.fee || 0,
      duration: slot.slotDuration,
      location: slot.location || 'Hospital',
      message: `✅ Appointment confirmed! ${patient.firstName}, your appointment with Dr. ${doctor.lastName} is scheduled for ${date} at ${time}. A confirmation has been noted in the system.`
    };
  } catch (error) {
    console.error('❌ Book Appointment VAPI Error:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message,
      status: 'error'
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
    const { doctorId, doctor_id, doctorName, doctor_name, name } = input;
    let finalDoctorId = doctorId || doctor_id;
    const doctorNameParam = doctorName || doctor_name || name;

    console.log('👨‍⚕️  Checking Doctor Availability Input:', { 
      doctorId: finalDoctorId, 
      doctorName: doctorNameParam 
    });

    // If doctorId is a string that looks like a name (contains spaces or "Dr"), try to find by name
    if (finalDoctorId && typeof finalDoctorId === 'string' && 
        (finalDoctorId.includes(' ') || finalDoctorId.toLowerCase().startsWith('dr'))) {
      console.log('⚠️  Received doctor name instead of ID. Attempting to find by name...');
      
      const cleanName = finalDoctorId.replace(/^dr\.\s+/i, '').trim();
      const nameParts = cleanName.split(/\s+/);
      
      let query = { role: 'doctor' };
      if (nameParts.length >= 2) {
        query.$or = [
          { 
            firstName: { $regex: nameParts[0], $options: 'i' },
            lastName: { $regex: nameParts.slice(1).join(' '), $options: 'i' }
          },
          { firstName: { $regex: nameParts[0], $options: 'i' } },
          { lastName: { $regex: nameParts.slice(1).join(' '), $options: 'i' } }
        ];
      } else {
        query.$or = [
          { firstName: { $regex: nameParts[0], $options: 'i' } },
          { lastName: { $regex: nameParts[0], $options: 'i' } }
        ];
      }
      
      const foundDoctor = await User.findOne(query);
      if (foundDoctor) {
        finalDoctorId = foundDoctor._id;
        console.log('✅ Found doctor by name:', finalDoctorId);
      } else {
        console.log('❌ Could not find doctor by name:', cleanName);
        return {
          error: `Doctor "${cleanName}" not found. Please use the doctor ID from the list.`,
          available: false,
          message: '❌ Please select from the list of available doctors'
        };
      }
    }

    // Validation
    if (!finalDoctorId) {
      console.log('❌ Doctor ID not provided');
      return {
        error: 'Doctor ID is required. Use doctorId from list-doctors response.',
        available: false,
        message: 'Please provide a valid doctor ID from the list'
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
    let searchSpecialty = specialization || specialty;

    // Normalize specialization - handle common variations
    if (searchSpecialty) {
      // Remove common suffixes for matching
      searchSpecialty = searchSpecialty.trim();
      
      // Create flexible regex that handles variations
      // e.g., "Cardiologist" will match "Cardiology", "Cardio" will match both
      const baseSpecialty = searchSpecialty
        .replace(/ist$|ology$/i, '') // Remove -ist and -ology suffixes
        .trim();
      
      console.log('🔍 Specialty Normalization:', {
        original: searchSpecialty,
        base: baseSpecialty
      });
    }

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
      // Enhanced search: match specialty, specialization, and variations
      query.$or = query.$or || [];
      query.$or.push(
        { specialization: { $regex: searchSpecialty, $options: 'i' } },
        { specialization: { $regex: searchSpecialty.replace(/ist$|ology$/i, ''), $options: 'i' } }
      );
    }

    console.log('📊 Query:', JSON.stringify(query, null, 2));

    const doctors = await User.find(query)
      .select('_id firstName lastName specialization department phone email licenseNumber experience city isActive')
      .limit(20);

    console.log(`📍 Found ${doctors.length} doctors in database`);

    if (doctors.length === 0) {
      console.log('⚠️ No doctors found matching criteria');
      return {
        found: false,
        doctorCount: 0,
        doctors: [],
        message: `No doctors found${searchName ? ` matching "${searchName}"` : ''}${searchSpecialty ? ` with specialty "${searchSpecialty}"` : ''}`
      };
    }

    console.log(`✅ Found ${doctors.length} doctors`);

    return {
      found: true,
      doctorCount: doctors.length,
      doctors: doctors.map(doc => ({
        doctorId: doc._id.toString(),
        name: `Dr. ${doc.firstName} ${doc.lastName}`,
        firstName: doc.firstName,
        lastName: doc.lastName,
        specialization: doc.specialization,
        department: doc.department || 'Not specified',
        phone: doc.phone || 'Not available',
        email: doc.email || 'Not available',
        licenseNumber: doc.licenseNumber || 'Not specified',
        experience: doc.experience ? `${doc.experience} years` : 'Not specified',
        city: doc.city || 'Not specified',
        isActive: doc.isActive,
        status: 'Available for booking'
      })),
      message: `✅ Found ${doctors.length} available doctor(s)${searchSpecialty ? ` in ${searchSpecialty}` : ''}`
    };
  } catch (error) {
    console.error('❌ Find Doctor Error:', error.message);
    return {
      error: error.message,
      found: false,
      doctorCount: 0,
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
    const { specialization, specialty, limit = 50, name, doctorName } = input;
    const searchSpecialty = specialization || specialty;
    let searchName = name || doctorName;

    // Clean up doctor name - remove "Dr. " prefix if present
    if (searchName) {
      searchName = searchName.replace(/^dr\.\s+/i, '').trim();
      console.log('🔍 Cleaned Doctor Name:', searchName);
    }

    console.log('📋 Listing All Doctors:', {
      specialization: searchSpecialty,
      name: searchName,
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

    // Optional: Filter by doctor name
    if (searchName) {
      // Split name into parts for flexible matching
      const nameParts = searchName.split(/\s+/).filter(part => part.length > 0);
      
      if (nameParts.length === 1) {
        // Single name part - search first or last name
        query.$or = [
          { firstName: { $regex: nameParts[0], $options: 'i' } },
          { lastName: { $regex: nameParts[0], $options: 'i' } }
        ];
      } else if (nameParts.length >= 2) {
        // Multiple parts - search for first name + last name combination
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        query.$or = [
          // Exact first name + last name
          { 
            firstName: { $regex: firstName, $options: 'i' },
            lastName: { $regex: lastName, $options: 'i' }
          },
          // Or just first name matches
          { firstName: { $regex: firstName, $options: 'i' } },
          // Or just last name matches
          { lastName: { $regex: lastName, $options: 'i' } }
        ];
      }
    }

    // Fetch all active doctors
    const doctors = await User.find(query)
      .select('_id firstName lastName specialization department phone email licenseNumber experience city isActive')
      .limit(limit)
      .sort({ firstName: 1 });

    if (doctors.length === 0) {
      console.log('ℹ️ No doctors found');
      const filterMsg = [];
      if (searchSpecialty) filterMsg.push(`specialization "${searchSpecialty}"`);
      if (searchName) filterMsg.push(`name "${searchName}"`);
      
      return {
        success: true,
        error: null,
        totalDoctors: 0,
        doctors: [],
        message: filterMsg.length > 0
          ? `No doctors found with ${filterMsg.join(' and ')}`
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

    // Build filter description
    const filterParts = [];
    if (searchSpecialty) filterParts.push(`Specialization: ${searchSpecialty}`);
    if (searchName) filterParts.push(`Name: ${searchName}`);
    const filterDesc = filterParts.length > 0 ? filterParts.join(', ') : 'All specializations';

    return {
      success: true,
      error: null,
      totalDoctors: doctorsList.length,
      doctors: doctorsList,
      filter: filterDesc,
      message: filterParts.length > 0
        ? `✅ Found ${doctorsList.length} doctor(s) matching ${filterParts.join(' and ')}`
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

/**
 * Tool: Register Patient
 * Create new patient account via VAPI agent
 * For NEW patients calling the hospital's VAPI agent
 * Returns patientId to use for appointment booking
 */
async function handleRegisterPatient(input) {
  try {
    const { firstName, lastName, email, phone, password, age, medicalHistory, gender, dateOfBirth } = input;

    console.log('👤 Registering New Patient:', { firstName, lastName, email, phone });

    // ========================================
    // VALIDATION
    // ========================================
    if (!firstName || !lastName || !email || !phone) {
      return {
        success: false,
        result: {
          error: 'firstName, lastName, email, and phone are required'
        }
      };
    }

    // Check if patient already exists
    const existingPatient = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone }
      ],
      role: 'patient'
    });

    if (existingPatient) {
      console.log('⚠️ Patient already exists:', existingPatient._id);
      return {
        success: true,
        result: {
          found: true,
          isExisting: true,
          patientId: existingPatient._id.toString(),
          name: `${existingPatient.firstName} ${existingPatient.lastName}`,
          email: existingPatient.email,
          phone: existingPatient.phone,
          message: `Patient ${existingPatient.firstName} already registered. Proceeding with booking...`,
          alreadyExists: true
        }
      };
    }

    // ========================================
    // CREATE NEW PATIENT
    // ========================================
    
    // Generate username from email
    const username = email.split('@')[0] + '_' + Date.now();
    
    // Generate temporary password if not provided
    const patientPassword = password || 'Temp@' + Math.random().toString(36).slice(-8);

    const newPatient = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      username,
      password: patientPassword,
      phone,
      role: 'patient',
      age,
      medicalHistory,
      gender,
      dateOfBirth,
      isActive: true
    });

    await newPatient.save();

    console.log('✅ New Patient Registered:', newPatient._id);

    return {
      success: true,
      result: {
        found: false,
        isExisting: false,
        isNew: true,
        registered: true,
        patientId: newPatient._id.toString(),
        name: `${newPatient.firstName} ${newPatient.lastName}`,
        email: newPatient.email,
        phone: newPatient.phone,
        username: newPatient.username,
        message: `✅ Patient ${newPatient.firstName} ${newPatient.lastName} registered successfully! Ready to book appointment.`,
        alreadyExists: false
      }
    };
  } catch (error) {
    console.error('❌ Register Patient Error:', error.message);
    return {
      success: false,
      result: {
        error: error.message
      }
    };
  }
}

module.exports = router;
