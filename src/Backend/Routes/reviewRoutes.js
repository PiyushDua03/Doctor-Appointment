const express = require('express');
const router = express.Router();
const { createReview, getDoctorReviews } = require('../Controllers/reviewController');
const { protect } = require('../Middleware/authMiddleware');

router.post('/', protect, createReview);
router.get('/doctor/:doctorId', getDoctorReviews);

module.exports = router;
