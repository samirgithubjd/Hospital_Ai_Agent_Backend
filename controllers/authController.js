const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active (for doctors and admins)
    if (!user.isActive && (user.role === 'admin' || user.role === 'doctor')) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          specialization: user.role === 'doctor' ? user.specialization : undefined,
          department: user.role === 'doctor' ? user.department : undefined
        }
      }
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

const register = async (req, res) => {
  try {
    const { email, username, password, confirmPassword, role, firstName, lastName, phone, age, medicalHistory } = req.body;

    // Only allow patient registration via public endpoint
    if (role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Patients can only self-register. Admin and Doctor accounts must be created by admin.',
        allowedRoles: ['patient']
      });
    }

    // Validation
    if (!email || !username || !firstName || !lastName || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, username, first name, last name, password, and confirm password are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters'
      });
    }

    // Check if user already exists (email or username)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Create patient
    const userData = {
      email,
      username,
      password,
      role: 'patient',
      firstName,
      lastName,
      phone,
      age,
      medicalHistory,
      isActive: true
    };

    const user = new User(userData);
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });
  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

module.exports = { login, register, generateToken };
