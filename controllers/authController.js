const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Login - Support email or phone + password + role
 * Can use either 'contact' or 'email' parameter
 * Role is optional (patient, doctor, admin)
 */
const login = async (req, res) => {
  try {
    const { password, role } = req.body;
    const contact = req.body.contact || req.body.email; // Accept both 'contact' and 'email'

    // Validation
    if (!contact || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/contact and password are required'
      });
    }

    // Validate role if provided
    const validRoles = ['patient', 'doctor', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be: patient, doctor, or admin'
      });
    }

    // Find user by email or phone (and role if provided)
    const query = {
      $or: [
        { email: contact.toLowerCase() },
        { phone: contact }
      ]
    };

    // Add role filter if provided
    if (role) {
      query.role = role;
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid contact or password'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid contact or password'
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

    console.log(`✅ Login successful: ${user.email} (${user.role})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          specialization: user.role === 'doctor' ? user.specialization : undefined,
          department: user.role === 'doctor' ? user.department : undefined
        }
      }
    });
  } catch (error) {
    console.error('❌ Login Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Register User - Phone number is REQUIRED
 * Supports multiple roles: patient (default), doctor, admin
 * Role can be specified in request payload
 */
const register = async (req, res) => {
  try {
    const { email, username, password, confirmPassword, firstName, lastName, phone, age, medicalHistory, role } = req.body;

    // Default role to 'patient' if not provided
    const userRole = role || 'patient';

    // Validate role
    const validRoles = ['patient', 'doctor', 'admin'];
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be: patient, doctor, or admin. Defaults to patient if not specified.'
      });
    }

    // Validation
    if (!email || !username || !firstName || !lastName || !password || !confirmPassword || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email, username, first name, last name, phone number, password, and confirm password are required'
      });
    }

    // Validate phone number (basic validation)
    if (phone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be at least 10 digits'
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

    // Check if user already exists (email, username, or phone)
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken'
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Create user with specified role
    const userData = {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      role: userRole,
      firstName,
      lastName,
      phone,
      age: userRole === 'patient' ? age : undefined,
      medicalHistory: userRole === 'patient' ? medicalHistory : undefined,
      isActive: true
    };

    const user = new User(userData);
    await user.save();

    console.log(`✅ User registered (${userRole}): ${user.email}`);

    res.status(201).json({
      success: true,
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} registered successfully`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('❌ Register Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

module.exports = { login, register, generateToken };
