const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      default: '',
      trim: true,
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
 );

// Static method to calculate and update doctor average rating & total reviews
reviewSchema.statics.calculateAverageRating = async function (doctorId) {
  try {
    const stats = await this.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
      {
        $group: {
          _id: '$doctorId',
          nRating: { $sum: 1 },
          avgRating: { $avg: '$rating' },
        },
      },
    ]);

    const DoctorProfile = mongoose.model('DoctorProfile');
    if (stats.length > 0) {
      await DoctorProfile.findByIdAndUpdate(doctorId, {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        totalReviews: stats[0].nRating,
      });
    } else {
      await DoctorProfile.findByIdAndUpdate(doctorId, {
        rating: 0,
        totalReviews: 0,
      });
    }
  } catch (err) {
    console.error('Error calculating average rating:', err.message);
  }
};

// Recalculate average rating after saving a review
reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.doctorId);
});

// Recalculate average rating after deleting a review
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.doctorId);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
