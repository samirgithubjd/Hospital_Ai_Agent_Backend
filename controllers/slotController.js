const Slot = require('../models/Slot');
const User = require('../models/User');

/**
 * Add available slots for a doctor (Doctor/Admin only)
 */
const addSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, startTime, endTime, slotDuration, location, fee, reason, isRecurring, recurringPattern, recurringEndDate } = req.body;

    // Validation
    if (!date || !startTime || !endTime || !slotDuration) {
      return res.status(400).json({
        success: false,
        message: 'Date, startTime, endTime, and slotDuration are required'
      });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if time format is valid (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Time must be in HH:MM format (24-hour)'
      });
    }

    // Generate slots based on duration
    const slots = [];
    const appointmentDate = new Date(date);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentStart = new Date(appointmentDate);
    currentStart.setHours(startHour, startMin, 0, 0);

    const endDate = new Date(appointmentDate);
    endDate.setHours(endHour, endMin, 0, 0);

    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Create individual slots
    while (currentStart < endDate) {
      const slotStart = currentStart.toTimeString().slice(0, 5);
      const slotEnd = new Date(currentStart.getTime() + slotDuration * 60000).toTimeString().slice(0, 5);

      slots.push({
        doctorId,
        date: new Date(appointmentDate),
        startTime: slotStart,
        endTime: slotEnd,
        slotDuration,
        dayOfWeek,
        isAvailable: true,
        location,
        fee,
        isRecurring,
        recurringPattern,
        recurringEndDate
      });

      currentStart = new Date(currentStart.getTime() + slotDuration * 60000);
    }

    if (slots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No slots could be generated with given time range and duration'
      });
    }

    // Insert all slots
    const createdSlots = await Slot.insertMany(slots);

    res.status(201).json({
      success: true,
      message: `${createdSlots.length} slots created successfully`,
      data: {
        doctorId,
        date,
        startTime,
        endTime,
        slotDuration,
        slotsCreated: createdSlots.length,
        slots: createdSlots
      }
    });
  } catch (error) {
    console.error('Add Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to add slots',
      error: error.message
    });
  }
};

/**
 * Get available slots for a specific doctor on a specific date
 */
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date query parameter is required (format: YYYY-MM-DD)'
      });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Parse date
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all slots for the doctor on this date
    const slots = await Slot.find({
      doctorId,
      date: {
        $gte: queryDate,
        $lt: nextDay
      }
    })
      .select('-__v')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      message: 'Available slots retrieved successfully',
      data: {
        doctorId,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization,
        date: date,
        totalSlots: slots.length,
        availableSlots: slots.filter(s => s.isAvailable).length,
        slots: slots
      }
    });
  } catch (error) {
    console.error('Get Available Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available slots',
      error: error.message
    });
  }
};

/**
 * Get all available doctors with their available slots for a date
 */
const getAllAvailableSlotsForDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date query parameter is required (format: YYYY-MM-DD)'
      });
    }

    // Parse date
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all available slots for all doctors on this date
    const slots = await Slot.find({
      date: {
        $gte: queryDate,
        $lt: nextDay
      },
      isAvailable: true
    })
      .populate('doctorId', 'firstName lastName specialization department city experience mobileNumber')
      .sort({ 'doctorId._id': 1, startTime: 1 });

    // Group by doctor
    const groupedSlots = slots.reduce((acc, slot) => {
      const doctorId = slot.doctorId._id.toString();
      if (!acc[doctorId]) {
        acc[doctorId] = {
          doctor: slot.doctorId,
          slots: []
        };
      }
      acc[doctorId].slots.push(slot);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Available slots for all doctors retrieved successfully',
      data: {
        date: date,
        doctorsWithSlots: Object.values(groupedSlots),
        totalSlots: slots.length
      }
    });
  } catch (error) {
    console.error('Get All Available Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available slots',
      error: error.message
    });
  }
};

/**
 * Block a time slot (Doctor/Admin)
 */
const blockSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { reason } = req.body;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    slot.isAvailable = false;
    slot.reason = reason || 'Blocked by doctor';
    await slot.save();

    res.status(200).json({
      success: true,
      message: 'Slot blocked successfully',
      data: slot
    });
  } catch (error) {
    console.error('Block Slot Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to block slot',
      error: error.message
    });
  }
};

/**
 * Unblock a time slot (Doctor/Admin)
 */
const unblockSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    slot.isAvailable = true;
    slot.reason = null;
    slot.appointmentId = null;
    await slot.save();

    res.status(200).json({
      success: true,
      message: 'Slot unblocked successfully',
      data: slot
    });
  } catch (error) {
    console.error('Unblock Slot Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock slot',
      error: error.message
    });
  }
};

/**
 * Delete a slot (Doctor/Admin)
 */
const deleteSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    await Slot.findByIdAndDelete(slotId);

    res.status(200).json({
      success: true,
      message: 'Slot deleted successfully',
      data: {
        slotId,
        deletedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Delete Slot Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete slot',
      error: error.message
    });
  }
};

/**
 * Get doctor's slots for a date range (Doctor only)
 */
const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required (format: YYYY-MM-DD)'
      });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const slots = await Slot.find({
      doctorId,
      date: {
        $gte: start,
        $lte: end
      }
    })
      .sort({ date: 1, startTime: 1 });

    const summary = {
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.isAvailable).length,
      bookedSlots: slots.filter(s => !s.isAvailable && s.appointmentId).length,
      blockedSlots: slots.filter(s => !s.isAvailable && !s.appointmentId).length
    };

    res.status(200).json({
      success: true,
      message: 'Doctor slots retrieved successfully',
      data: {
        doctorId,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        dateRange: { startDate, endDate },
        summary,
        slots
      }
    });
  } catch (error) {
    console.error('Get Doctor Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctor slots',
      error: error.message
    });
  }
};

/**
 * Get slot by ID
 */
const getSlotById = async (req, res) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId)
      .populate('doctorId', 'firstName lastName specialization')
      .populate('appointmentId');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Slot retrieved successfully',
      data: slot
    });
  } catch (error) {
    console.error('Get Slot Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve slot',
      error: error.message
    });
  }
};

/**
 * Update slot details (Admin/Doctor only)
 */
const updateSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { startTime, endTime, slotDuration, location, fee, isAvailable } = req.body;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in HH:MM format (24-hour)'
      });
    }
    if (endTime && !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'End time must be in HH:MM format (24-hour)'
      });
    }

    // Update fields
    if (startTime) slot.startTime = startTime;
    if (endTime) slot.endTime = endTime;
    if (slotDuration) slot.slotDuration = slotDuration;
    if (location) slot.location = location;
    if (fee !== undefined) slot.fee = fee;
    if (isAvailable !== undefined) slot.isAvailable = isAvailable;

    await slot.save();

    res.status(200).json({
      success: true,
      message: 'Slot updated successfully',
      data: slot
    });
  } catch (error) {
    console.error('Update Slot Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update slot',
      error: error.message
    });
  }
};

/**
 * Get all slots for a doctor with admin details (Admin only)
 */
const getAllDoctorSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate, isAvailable, page = 1, limit = 20 } = req.query;

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const filter = { doctorId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: start,
        $lte: end
      };
    }

    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Slot.countDocuments(filter);
    const slots = await Slot.find(filter)
      .populate('doctorId', 'firstName lastName specialization email phone')
      .populate('appointmentId')
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const summary = {
      totalSlots: total,
      availableSlots: await Slot.countDocuments({ ...filter, isAvailable: true }),
      bookedSlots: await Slot.countDocuments({ ...filter, isAvailable: false, appointmentId: { $ne: null } }),
      blockedSlots: await Slot.countDocuments({ ...filter, isAvailable: false, appointmentId: null })
    };

    res.status(200).json({
      success: true,
      message: 'Doctor slots retrieved successfully',
      data: {
        doctorId,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctor.specialization,
        summary,
        slots
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get All Doctor Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctor slots',
      error: error.message
    });
  }
};

/**
 * Get all slots for all doctors (Admin only)
 */
const getAllSlots = async (req, res) => {
  try {
    const { startDate, endDate, doctorId, isAvailable, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (doctorId) filter.doctorId = doctorId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filter.date = {
        $gte: start,
        $lte: end
      };
    }

    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Slot.countDocuments(filter);

    const slots = await Slot.find(filter)
      .populate('doctorId', 'firstName lastName specialization email phone department city')
      .populate('appointmentId', 'patientId appointmentDate appointmentTime status')
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const summary = {
      totalSlots: total,
      availableSlots: await Slot.countDocuments({ ...filter, isAvailable: true }),
      bookedSlots: await Slot.countDocuments({ ...filter, isAvailable: false, appointmentId: { $ne: null } }),
      blockedSlots: await Slot.countDocuments({ ...filter, isAvailable: false, appointmentId: null })
    };

    res.status(200).json({
      success: true,
      message: 'All slots retrieved successfully',
      data: {
        summary,
        slots
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get All Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve slots',
      error: error.message
    });
  }
};

/**
 * Delete multiple slots (Admin/Doctor only)
 */
const deleteMultipleSlots = async (req, res) => {
  try {
    const { slotIds } = req.body;

    if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'slotIds array is required'
      });
    }

    const result = await Slot.deleteMany({
      _id: { $in: slotIds }
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} slots deleted successfully`,
      data: {
        deletedCount: result.deletedCount,
        slotIds
      }
    });
  } catch (error) {
    console.error('Delete Multiple Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete slots',
      error: error.message
    });
  }
};

/**
 * Bulk update slots (Admin/Doctor only)
 */
const bulkUpdateSlots = async (req, res) => {
  try {
    const { slotIds, location, fee, isAvailable } = req.body;

    if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'slotIds array is required'
      });
    }

    const updateData = {};
    if (location) updateData.location = location;
    if (fee !== undefined) updateData.fee = fee;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const result = await Slot.updateMany(
      { _id: { $in: slotIds } },
      { $set: updateData }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} slots updated successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        slotIds
      }
    });
  } catch (error) {
    console.error('Bulk Update Slots Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update slots',
      error: error.message
    });
  }
};

/**
 * Check if a specific slot is available
 * POST /api/slots/check-availability
 * Used by AI agent to verify before booking
 */
const checkSlotAvailability = async (req, res) => {
  try {
    const { doctorId, date, time, duration } = req.body;

    // Validation
    if (!doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'doctorId, date, and time are required'
      });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Parse date
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find slot that matches doctor, date, and time
    const slot = await Slot.findOne({
      doctorId,
      date: {
        $gte: queryDate,
        $lt: nextDay
      },
      startTime: { $lte: time },
      endTime: { $gte: time },
      isAvailable: true
    }).populate('doctorId', 'firstName lastName specialization');

    if (!slot) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'No available slot found for the requested date and time'
      });
    }

    res.status(200).json({
      success: true,
      available: true,
      message: 'Slot is available for booking',
      data: {
        slotId: slot._id,
        doctorId: slot.doctorId._id,
        doctorName: `${slot.doctorId.firstName} ${slot.doctorId.lastName}`,
        specialization: slot.doctorId.specialization,
        date: date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.slotDuration
      }
    });
  } catch (error) {
    console.error('Check Slot Availability Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to check slot availability',
      error: error.message
    });
  }
};

module.exports = {
  addSlots,
  getAvailableSlots,
  getAllAvailableSlotsForDate,
  blockSlot,
  unblockSlot,
  deleteSlot,
  getDoctorSlots,
  getSlotById,
  updateSlot,
  getAllDoctorSlots,
  getAllSlots,
  deleteMultipleSlots,
  bulkUpdateSlots,
  checkSlotAvailability
};
