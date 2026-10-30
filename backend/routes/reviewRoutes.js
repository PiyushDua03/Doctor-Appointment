const express = require('express');
const router = express.Router();
const { createReview, getDoctorReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createReview);
router.get('/doctor/:doctorId', getDoctorReviews);

module.exports = router;
