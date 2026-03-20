const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    phoneNumber: {
      type: String,
      required: false
    },
    patientName: {
      type: String,
      required: false
    },
    fromNumber: {
      type: String,
      default: '+1-914-465-1284'
    },
    duration: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'connected', 'completed', 'missed', 'failed', 'rejected'],
      default: 'initiated'
    },
    transcript: {
      type: String,
      required: false
    },
    recordingUrl: {
      type: String,
      required: false
    },
    vapiCallId: {
      type: String,
      required: false,
      index: true
    },
    callType: {
      type: String,
      enum: ['inbound', 'outbound', 'callback'],
      default: 'inbound'
    },
    areaCode: {
      type: String,
      default: '914'
    },
    // New appointment-related fields
    symptoms: {
      type: String,
      required: false
    },
    diagnosis: {
      type: String,
      required: false
    },
    emergencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      required: false
    },
    isEmergency: {
      type: Boolean,
      default: false
    },
    appointmentBooked: {
      type: Boolean,
      default: false
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: false
    },
    suggestedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    notes: {
      type: String,
      required: false
    },
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: {
      type: Date,
      required: false
    },
    vapiCallData: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    },
    startTime: {
      type: Date,
      required: false
    },
    endTime: {
      type: Date,
      required: false
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

// Index for quick queries
callSchema.index({ patientId: 1 });
callSchema.index({ status: 1 });
callSchema.index({ createdAt: -1 });
callSchema.index({ isEmergency: 1 });
callSchema.index({ appointmentBooked: 1 });

module.exports = mongoose.model('Call', callSchema);
