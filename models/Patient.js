const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false
    },
    age: {
      type: Number,
      required: false
    },
    phone: {
      type: String,
      required: false
    },
    symptoms: {
      type: String,
      required: false
    },
    isEmergency: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

module.exports = mongoose.model('Patient', patientSchema);
