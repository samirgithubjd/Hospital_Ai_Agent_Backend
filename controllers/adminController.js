const User = require('../models/User');
const { generateToken } = require('./authController');

/**
 * Create Admin Account (Admin Only)
 * Only existing admins can create new admin accounts
 */
const createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, firstName, and lastName are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Generate username from email
    const username = email.split('@')[0] + '_admin_' + Date.now();

    // Create admin user
    const admin = new User({
      email,
      username,
      password,
      role: 'admin',
      firstName,
      lastName,
      phone,
      isActive: true
    });

    await admin.save();

    const token = generateToken(admin._id, admin.role);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          username: admin.username,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: 'admin',
          isActive: true
        }
      }
    });
  } catch (error) {
    console.error('Create Admin Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin account',
      error: error.message
    });
  }
};

/**
 * Create Doctor Account (Admin Only)
 */
const createDoctor = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, specialization, department, licenseNumber, city, experience, mobileNumber } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, firstName, and lastName are required'
      });
    }

    if (!specialization || !licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'Specialization and license number are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Doctor with this email already exists'
      });
    }

    // Generate username from email
    const username = email.split('@')[0] + '_' + Date.now();

    // Create doctor user
    const doctor = new User({
      email,
      username,
      password,
      role: 'doctor',
      firstName,
      lastName,
      phone,
      specialization,
      department,
      licenseNumber,
      city,
      experience,
      mobileNumber,
      isActive: false // Doctors start as inactive, can be approved by admin
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      data: {
        doctor: {
          id: doctor._id,
          email: doctor.email,
          username: doctor.username,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          phone: doctor.phone,
          specialization: doctor.specialization,
          department: doctor.department,
          licenseNumber: doctor.licenseNumber,
          city: doctor.city,
          experience: doctor.experience,
          mobileNumber: doctor.mobileNumber,
          role: 'doctor',
          isActive: false,
          createdAt: doctor.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Create Doctor Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create doctor account',
      error: error.message
    });
  }
};

/**
 * Get All Admins (Admin Only)
 */
const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ role: 'admin' });

    res.status(200).json({
      success: true,
      message: 'Admins retrieved successfully',
      data: admins,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Admins Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admins',
      error: error.message
    });
  }
};

/**
 * Get All Doctors (Admin Only)
 */
const getAllDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, specialization } = req.query;

    const filter = { role: 'doctor' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (specialization) filter.specialization = specialization;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully',
      data: doctors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Doctors Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve doctors',
      error: error.message
    });
  }
};

/**
 * Get Pending Doctor Approvals (Admin Only)
 */
const getPendingDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isActive: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Pending doctor approvals retrieved',
      data: doctors,
      count: doctors.length
    });
  } catch (error) {
    console.error('Get Pending Doctors Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending doctors',
      error: error.message
    });
  }
};

/**
 * Approve Doctor (Admin Only)
 */
const approveDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.isActive = true;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Doctor approved successfully',
      data: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialization: doctor.specialization,
        isActive: true,
        approvedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Approve Doctor Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to approve doctor',
      error: error.message
    });
  }
};

/**
 * Reject Doctor (Admin Only)
 */
const rejectDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Delete the doctor account
    await User.findByIdAndDelete(doctorId);

    res.status(200).json({
      success: true,
      message: 'Doctor rejected and deleted successfully',
      data: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        rejectionReason: reason || 'No reason provided',
        rejectedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Reject Doctor Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reject doctor',
      error: error.message
    });
  }
};

/**
 * Deactivate Doctor (Admin Only)
 */
const deactivateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor.isActive = false;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Doctor deactivated successfully',
      data: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        isActive: false,
        deactivationReason: reason || 'No reason provided',
        deactivatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Deactivate Doctor Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate doctor',
      error: error.message
    });
  }
};

/**
 * Update Doctor Information (Admin Only)
 */
const updateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { specialization, department, phone, city, experience, mobileNumber } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (specialization) doctor.specialization = specialization;
    if (department) doctor.department = department;
    if (phone) doctor.phone = phone;
    if (city) doctor.city = city;
    if (experience !== undefined) doctor.experience = experience;
    if (mobileNumber) doctor.mobileNumber = mobileNumber;

    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        phone: doctor.phone,
        specialization: doctor.specialization,
        department: doctor.department,
        city: doctor.city,
        experience: doctor.experience,
        mobileNumber: doctor.mobileNumber
      }
    });
  } catch (error) {
    console.error('Update Doctor Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update doctor',
      error: error.message
    });
  }
};

/**
 * Delete Doctor (Admin Only)
 */
const deleteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    await User.findByIdAndDelete(doctorId);

    res.status(200).json({
      success: true,
      message: 'Doctor deleted successfully',
      data: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        deletedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Delete Doctor Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete doctor',
      error: error.message
    });
  }
};

/**
 * Get All Patients (Admin Only)
 */
const getAllPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ role: 'patient' });

    res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully',
      data: patients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Patients Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patients',
      error: error.message
    });
  }
};

/**
 * Get User by ID (Admin Only)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Get User Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
};

/**
 * Get System Statistics (Admin Only)
 */
const getSystemStats = async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      totalAdmins: await User.countDocuments({ role: 'admin' }),
      totalDoctors: await User.countDocuments({ role: 'doctor' }),
      activeDoctors: await User.countDocuments({ role: 'doctor', isActive: true }),
      inactiveDoctors: await User.countDocuments({ role: 'doctor', isActive: false }),
      totalPatients: await User.countDocuments({ role: 'patient' }),
      doctorsBySpecialization: await User.aggregate([
        { $match: { role: 'doctor' } },
        { $group: { _id: '$specialization', count: { $sum: 1 } } }
      ])
    };

    res.status(200).json({
      success: true,
      message: 'System statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Get System Stats Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system statistics',
      error: error.message
    });
  }
};

/**
 * Get All Active Doctors (For Patients - Public Access)
 * Returns active doctors for patient dashboard to book appointments
 */
const getActiveDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10, specialization } = req.query;

    const filter = { role: 'doctor', isActive: true };
    if (specialization) filter.specialization = specialization;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Active doctors retrieved successfully',
      data: doctors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Active Doctors Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active doctors',
      error: error.message
    });
  }
};

module.exports = {
  createAdmin,
  createDoctor,
  getAllAdmins,
  getAllDoctors,
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
  deactivateDoctor,
  updateDoctor,
  deleteDoctor,
  getAllPatients,
  getUserById,
  getSystemStats,
  getActiveDoctors
};
