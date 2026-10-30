const Review = require('../Models/Review');
const Appointment = require('../Models/Appointment');
const DoctorProfile = require('../Models/DoctorProfile');

// @desc    Submit review for a completed appointment
// @route   POST /api/reviews
// @access  Protected (Patient)
const createReview = async (req, res, next) => {
  try {
    const { appointmentId, rating, review, tags } = req.body;
    const patientId = req.user._id;

    if (!appointmentId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID and rating (1-5) are required.',
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (appointment.patientId.toString() !== patientId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this appointment.' });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted after the appointment is marked as completed.',
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ appointmentId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this appointment.',
      });
    }

    const newReview = await Review.create({
      doctorId: appointment.doctorId,
      patientId,
      appointmentId,
      rating: Number(rating),
      review: review || '',
      tags: tags || [],
    });

    // Mark appointment as reviewed
    appointment.isReviewed = true;
    await appointment.save();

    // Recalculate doctor's average rating
    const allReviews = await Review.find({ doctorId: appointment.doctorId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await DoctorProfile.findByIdAndUpdate(appointment.doctorId, {
      rating: Math.round(avg * 10) / 10,
      totalReviews: allReviews.length,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted successfully.',
      review: newReview,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a doctor
// @route   GET /api/reviews/doctor/:doctorId
// @access  Public
const getDoctorReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .populate('patientId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getDoctorReviews };
