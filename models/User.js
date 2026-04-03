const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'patient'],
      default: 'patient',
      required: true
    },
    // Common fields
    firstName: {
      type: String,
      required: false
    },
    lastName: {
      type: String,
      required: false
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true
    },
    // Email verification fields
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      required: false
    },
    emailVerificationExpiry: {
      type: Date,
      required: false
    },
    // Doctor specific fields
    specialization: {
      type: String,
      required: false
    },
    licenseNumber: {
      type: String,
      required: false
    },
    department: {
      type: String,
      required: false
    },
    city: {
      type: String,
      required: false
    },
    experience: {
      type: Number,
      required: false
    },
    mobileNumber: {
      type: String,
      required: false
    },
    // Patient specific fields
    age: {
      type: Number,
      required: false
    },
    medicalHistory: {
      type: String,
      required: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  // Skip if password hasn't been modified
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to get user info without password
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
