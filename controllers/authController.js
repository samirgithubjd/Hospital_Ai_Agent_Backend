const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../config/nodemailer');

const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Login - Support email or phone + password
 * Contact can be either email or phone number
 */
const login = async (req, res) => {
  try {
    const { contact, password } = req.body; // contact = email or phone

    // Validation
    if (!contact || !password) {
      return res.status(400).json({
        success: false,
        message: 'Contact (email or phone) and password are required'
      });
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: contact.toLowerCase() },
        { phone: contact }
      ]
    });

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

    // Check if email is verified (especially for patients)
    if (user.role === 'patient' && !user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        requiresEmailVerification: true,
        email: user.email
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
          isEmailVerified: user.isEmailVerified,
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
 * Register Patient - Phone number is REQUIRED
 * Sends email verification link
 */
const register = async (req, res) => {
  try {
    const { email, username, password, confirmPassword, firstName, lastName, phone, age, medicalHistory } = req.body;

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

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create patient
    const userData = {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      role: 'patient',
      firstName,
      lastName,
      phone,
      age,
      medicalHistory,
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    const user = new User(userData);
    await user.save();

    console.log(`✅ Patient registered (not verified): ${user.email}`);

    // Send verification email
    try {
      await sendVerificationEmail(user.email, emailVerificationToken, user.firstName);
    } catch (emailError) {
      console.error('⚠️ Registration successful but email verification failed:', emailError.message);
      return res.status(201).json({
        success: true,
        message: 'Registration successful, but verification email could not be sent. Please try verify email manually.',
        data: {
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            phone: user.phone,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: false
          },
          warning: 'Email verification failed. Please request a new verification link.'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: false
        },
        nextStep: 'Check your email for verification link (valid for 24 hours)'
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

/**
 * Verify Email
 * User clicks verification link with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    console.log('🔍 Verifying email with token:', token.substring(0, 10) + '...');

    // Find user with matching token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        requiresNewVerification: true
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    console.log(`✅ Email verified: ${user.email}`);

    // Generate token for immediate login
    const authToken = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        token: authToken,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: true
        }
      }
    });
  } catch (error) {
    console.error('❌ Email Verification Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

/**
 * Resend Verification Email
 * User can request new verification email if expired
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    console.log(`📧 Resending verification email to: ${user.email}`);

    // Send verification email
    await sendVerificationEmail(user.email, emailVerificationToken, user.firstName);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        email: user.email,
        message: 'Check your email for verification link (valid for 24 hours)'
      }
    });
  } catch (error) {
    console.error('❌ Resend Verification Email Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
      error: error.message
    });
  }
};

module.exports = { login, register, verifyEmail, resendVerificationEmail, generateToken };
