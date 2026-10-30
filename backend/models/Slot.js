const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    time: {
      type: String, // Format: HH:mm
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'locked', 'booked'],
      default: 'available',
      index: true,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound unique index: one slot per doctor per date+time
slotSchema.index({ doctorId: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);
