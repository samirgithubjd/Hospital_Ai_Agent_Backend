const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
adminSchema.pre('save', async function () {
  // Skip if password hasn't been modified
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
});

// Method to compare password
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
