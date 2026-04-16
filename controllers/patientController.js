const Patient = require('../models/Patient');
const User = require('../models/User');
const { Types } = require('mongoose');

const getAllPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully',
      data: patients
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

const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format',
        error: `Patient ID "${id}" is not a valid format`
      });
    }

    const patient = await User.findById(id)
      .select('-password');
    
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient retrieved successfully',
      data: patient
    });
  } catch (error) {
    console.error('Get Patient Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient',
      error: error.message
    });
  }
};

module.exports = { getAllPatients, getPatientById };
