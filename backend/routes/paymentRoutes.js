const express = require('express');
const router = express.Router();
const {
  getPaymentConfig,
  createOrder,
  processPayment,
  verifyPayment,
  getMyPayments,
  getPaymentById,
  getAppointmentPayment,
  refundPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Public gateway configuration
router.get('/config', getPaymentConfig);

// Create order / initiate payment
router.post('/create-order', protect, createOrder);
router.post('/order', protect, createOrder);

// Process direct payment (UPI, Card, Net Banking, Pay at Clinic)
router.post('/process', protect, processPayment);

// Verify gateway signature / payment
router.post('/verify', protect, verifyPayment);

// User payments history
router.get('/my', protect, getMyPayments);

// Appointment payment receipt
router.get('/appointment/:appointmentId', protect, getAppointmentPayment);

// Refund endpoints
router.post('/refund', protect, refundPayment);
router.post('/:id/refund', protect, refundPayment);

// Specific payment details
router.get('/:id', protect, getPaymentById);

module.exports = router;

