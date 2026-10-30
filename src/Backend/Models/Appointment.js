const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      unique: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    appointmentDate: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Appointment date is required'],
      index: true,
    },
    startTime: {
      type: String, // Format: HH:mm
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // Format: HH:mm
      default: function () {
        if (!this.startTime) return '10:30';
        const [h, m] = this.startTime.split(':').map(Number);
        const endTotal = h * 60 + m + 30;
        const endH = String(Math.floor(endTotal / 60)).padStart(2, '0');
        const endM = String(endTotal % 60).padStart(2, '0');
        return `${endH}:${endM}`;
      },
    },
    consultationType: {
      type: String,
      enum: ['In-Clinic Visit', 'Video Consultation'],
      default: 'In-Clinic Visit',
    },
    meetingLink: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: 'General Consultation',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
    fee: {
      type: Number,
      required: true,
      default: 500,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'pay_at_clinic'],
      default: 'paid',
    },
    paymentMethod: {
      type: String,
      default: 'UPI / Online',
    },
    transactionId: {
      type: String,
      default: function () {
        return `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      },
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
    prescription: {
      type: String,
      default: '',
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
appointmentSchema.virtual('date').get(function () {
  return this.appointmentDate;
}).set(function (v) {
  this.appointmentDate = v;
});

appointmentSchema.virtual('time').get(function () {
  return this.startTime;
}).set(function (v) {
  this.startTime = v;
});

// Auto-generate realistic appointmentId and video meeting link
appointmentSchema.pre('save', function () {
  if (!this.appointmentId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.appointmentId = `APT-${today}-${rand}`;
  }
  if (!this.meetingLink && this.consultationType === 'Video Consultation') {
    this.meetingLink = `https://meet.doctorp.com/room/${this.appointmentId}`;
  }
});

// Compound partial index to prevent double bookings of active slots
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
