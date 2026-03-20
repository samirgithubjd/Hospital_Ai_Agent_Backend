const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    appointmentDate: {
      type: Date,
      required: true
    },
    appointmentTime: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      default: 30, // in minutes
      required: false
    },
    symptoms: {
      type: String,
      required: false
    },
    diagnosis: {
      type: String,
      required: false
    },
    prescriptions: {
      type: String,
      required: false
    },
    notes: {
      type: String,
      required: false
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
      required: true
    },
    cancellationReason: {
      type: String,
      required: false
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      required: false
    },
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call',
      required: false
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: {
      type: Date,
      required: false
    },
    isEmergency: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      required: false
    },
    confirmedAt: {
      type: Date,
      required: false
    },
    completedAt: {
      type: Date,
      required: false
    },
    rescheduleCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for quick queries
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
