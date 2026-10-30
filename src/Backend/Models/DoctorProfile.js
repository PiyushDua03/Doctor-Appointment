const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    medicalRegNumber: {
      type: String,
      default: 'MCI-84920-IND',
      trim: true,
    },
    qualifications: [
      {
        type: String,
        trim: true,
      },
    ],
    experience: {
      type: Number,
      required: true,
      default: 5,
    },
    consultationFee: {
      type: Number,
      required: true,
      default: 600,
    },
    clinicName: {
      type: String,
      default: 'Apollo Health Supercentre',
      trim: true,
    },
    location: {
      address: { type: String, default: 'Sarita Vihar, Mathura Road' },
      city: { type: String, default: 'New Delhi', index: true },
      state: { type: String, default: 'Delhi' },
      pincode: { type: String, default: '110076' },
      coordinates: {
        lat: { type: Number, default: 28.5355 },
        lng: { type: Number, default: 77.291 },
      },
    },
    languages: {
      type: [String],
      default: ['English', 'Hindi'],
    },
    consultationModes: {
      type: [String],
      default: ['In-Clinic Visit', 'Video Consultation'],
    },
    bio: {
      type: String,
      default: 'Distinguished healthcare practitioner with profound clinical acumen, dedicated to comprehensive patient care, proactive diagnostics, and personalized treatment therapies.',
    },
    awards: [
      {
        type: String,
        trim: true,
      },
    ],
    profileImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    isAvailableToday: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 4.9,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 34,
    },
    availableDays: [
      {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
    ],
    timeSlots: [
      {
        type: String, // e.g. "09:00", "09:30", "10:00", ...
      },
    ],
    slotDuration: {
      type: Number,
      default: 30, // in minutes
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compatibility getters & setters
doctorProfileSchema.virtual('specialty').get(function () {
  return this.specialization;
}).set(function (v) {
  this.specialization = v;
});

doctorProfileSchema.virtual('fee').get(function () {
  return this.consultationFee;
}).set(function (v) {
  this.consultationFee = v;
});

doctorProfileSchema.virtual('hospital').get(function () {
  return this.clinicName;
}).set(function (v) {
  this.clinicName = v;
});

doctorProfileSchema.virtual('avatar').get(function () {
  return this.profileImage;
}).set(function (v) {
  this.profileImage = v;
});

// Full-text search index
doctorProfileSchema.index({
  name: 'text',
  specialization: 'text',
  'location.city': 'text',
  clinicName: 'text',
});

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
