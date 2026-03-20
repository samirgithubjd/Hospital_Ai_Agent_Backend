const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Call = require('../models/Call');

// Create appointment
const createAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, symptoms, duration, isEmergency } = req.body;
    const patientId = req.userId; // From auth middleware

    // Validation
    if (!doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, appointment date, and time are required'
      });
    }

    // Verify doctor exists and is active
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (!doctor.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This doctor is not available'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      patientId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      symptoms,
      duration: duration || 30,
      isEmergency: isEmergency || false,
      priority: isEmergency ? 'urgent' : 'medium'
    });

    await appointment.save();

    // Populate references for response
    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName email phone username' },
      { path: 'doctorId', select: 'firstName lastName specialization department email username' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Create Appointment Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error.message
    });
  }
};

// Get all appointments (Admin only)
const getAllAppointments = async (req, res) => {
  try {
    const { status, doctorId, patientId, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;

    if (startDate || endDate) {
      filter.appointmentDate = {};
      if (startDate) filter.appointmentDate.$gte = new Date(startDate);
      if (endDate) filter.appointmentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email phone username')
      .populate('doctorId', 'firstName lastName specialization department email username')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved',
      data: appointments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Appointments Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      error: error.message
    });
  }
};

// Get doctor's appointments
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filter = { doctorId };
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.appointmentDate = {};
      if (startDate) filter.appointmentDate.$gte = new Date(startDate);
      if (endDate) filter.appointmentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email phone username age')
      .sort({ appointmentDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Your appointments retrieved',
      data: appointments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Doctor Appointments Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      error: error.message
    });
  }
};

// Get patient's appointments
const getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { patientId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'firstName lastName specialization department email username')
      .sort({ appointmentDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Your appointments retrieved',
      data: appointments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Patient Appointments Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      error: error.message
    });
  }
};

// Get appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'firstName lastName email phone username age medicalHistory')
      .populate('doctorId', 'firstName lastName specialization department email username phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment retrieved',
      data: appointment
    });
  } catch (error) {
    console.error('Get Appointment Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment',
      error: error.message
    });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, symptoms, diagnosis, prescriptions, notes, status } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update fields
    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (symptoms) appointment.symptoms = symptoms;
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (prescriptions) appointment.prescriptions = prescriptions;
    if (notes) appointment.notes = notes;
    if (status) {
      appointment.status = status;
      if (status === 'confirmed') appointment.confirmedAt = new Date();
      if (status === 'completed') appointment.completedAt = new Date();
    }

    await appointment.save();

    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName email' },
      { path: 'doctorId', select: 'firstName lastName specialization' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Update Appointment Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message
    });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, cancelledBy } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${appointment.status} appointment`
      });
    }

    appointment.status = 'cancelled';
    appointment.cancellationReason = reason || 'No reason provided';
    appointment.cancelledBy = cancelledBy || 'patient';

    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message
    });
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({
        success: false,
        message: 'New date and time are required'
      });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.appointmentDate = new Date(newDate);
    appointment.appointmentTime = newTime;
    appointment.status = 'rescheduled';
    appointment.rescheduleCount = (appointment.rescheduleCount || 0) + 1;

    await appointment.save();

    await appointment.populate([
      { path: 'patientId', select: 'firstName lastName email' },
      { path: 'doctorId', select: 'firstName lastName specialization' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Reschedule Appointment Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error.message
    });
  }
};

// Get appointments (Old function - kept for backward compatibility)
const getAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName email')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved',
      data: appointments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Appointments Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments',
      error: error.message
    });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const userRole = req.userRole;
    const userId = req.userId;

    let stats = {};

    if (userRole === 'admin') {
      // Admin stats
      stats = {
        totalAppointments: await Appointment.countDocuments(),
        scheduledAppointments: await Appointment.countDocuments({ status: 'scheduled' }),
        completedAppointments: await Appointment.countDocuments({ status: 'completed' }),
        cancelledAppointments: await Appointment.countDocuments({ status: 'cancelled' }),
        emergencyAppointments: await Appointment.countDocuments({ isEmergency: true }),
        totalDoctors: await User.countDocuments({ role: 'doctor', isActive: true }),
        inactiveDoctors: await User.countDocuments({ role: 'doctor', isActive: false }),
        totalPatients: await User.countDocuments({ role: 'patient' }),
        totalCalls: await Call.countDocuments(),
        emergencyCalls: await Call.countDocuments({ isEmergency: true })
      };
    } else if (userRole === 'doctor') {
      // Doctor stats
      stats = {
        myAppointments: await Appointment.countDocuments({ doctorId: userId }),
        todayAppointments: await Appointment.countDocuments({
          doctorId: userId,
          appointmentDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }),
        completedAppointments: await Appointment.countDocuments({ doctorId: userId, status: 'completed' }),
        cancelledAppointments: await Appointment.countDocuments({ doctorId: userId, status: 'cancelled' }),
        upcomingAppointments: await Appointment.countDocuments({
          doctorId: userId,
          status: { $in: ['scheduled', 'confirmed'] },
          appointmentDate: { $gte: new Date() }
        })
      };
    } else if (userRole === 'patient') {
      // Patient stats
      stats = {
        myAppointments: await Appointment.countDocuments({ patientId: userId }),
        upcomingAppointments: await Appointment.countDocuments({
          patientId: userId,
          status: { $in: ['scheduled', 'confirmed'] },
          appointmentDate: { $gte: new Date() }
        }),
        completedAppointments: await Appointment.countDocuments({ patientId: userId, status: 'completed' }),
        cancelledAppointments: await Appointment.countDocuments({ patientId: userId, status: 'cancelled' })
      };
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard stats retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard stats',
      error: error.message
    });
  }
};

module.exports = {
  createAppointment,
  getAllAppointments,
  getDoctorAppointments,
  getPatientAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAppointments,
  getDashboardStats
};
