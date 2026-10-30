const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  updateAppointmentStatus,
  getAllAppointments,
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Book appointment
router.post('/', protect, createAppointment);

// Logged-in user's appointments
router.get('/my', protect, getMyAppointments);

// Admin-level all appointments
router.get('/', protect, authorize('admin'), getAllAppointments);

// Specific appointment
router.get('/:id', protect, getAppointmentById);

// Cancel appointment
router.patch('/:id/cancel', protect, cancelAppointment);

// Status update (Doctor or Admin)
router.patch('/:id/status', protect, authorize('doctor', 'admin'), updateAppointmentStatus);

module.exports = router;
