const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String, // Format: HH:MM (24-hour)
      required: true
    },
    endTime: {
      type: String, // Format: HH:MM (24-hour)
      required: true
    },
    slotDuration: {
      type: Number, // in minutes (e.g., 30)
      default: 30,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: false
    },
    reason: {
      type: String, // Reason if slot is blocked/unavailable
      required: false
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: false
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringPattern: {
      type: String, // daily, weekly, monthly
      required: false
    },
    recurringEndDate: {
      type: Date,
      required: false
    },
    location: {
      type: String, // Clinic/Hospital location
      required: false
    },
    fee: {
      type: Number, // Consultation fee
      required: false
    }
  },
  {
    timestamps: true
  }
);

// Index for quick queries
slotSchema.index({ doctorId: 1, date: 1 });
slotSchema.index({ doctorId: 1, isAvailable: 1 });

module.exports = mongoose.model('Slot', slotSchema);
