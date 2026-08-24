/**
 * doctors.js — Doctor routes
 *
 * GET  /api/doctors                    — Public
 * GET  /api/doctors/:id                — Public
 * GET  /api/doctors/:id/appointments   — Authenticated doctor (self) or admin
 * GET  /api/doctors/:id/next-available — Public
 *
 * Demonstrates: Express Router, middleware chaining, route parameters
 */

'use strict';

const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  getDoctorAppointments,
  getNextAvailable,
  createDoctor,
  updateDoctor,
  deleteDoctor
} = require('../controllers/doctorController');
const { authenticate, authorize, requireSelf } = require('../middleware/auth');

// GET /api/doctors — list all doctors (public)
router.get('/', getDoctors);

// POST /api/doctors — create doctor (admin only)
router.post('/', authenticate, authorize('admin'), createDoctor);

// GET /api/doctors/:id — get single doctor (public)
router.get('/:id', getDoctorById);

// PUT /api/doctors/:id — update doctor (admin only)
router.put('/:id', authenticate, authorize('admin'), updateDoctor);

// DELETE /api/doctors/:id — delete doctor (admin only)
router.delete('/:id', authenticate, authorize('admin'), deleteDoctor);

// GET /api/doctors/:id/appointments — doctor's own appointments (protected)
router.get('/:id/appointments',
  authenticate,
  authorize('doctor', 'admin'),
  requireSelf,
  getDoctorAppointments
);

// GET /api/doctors/:id/next-available — next available slot (public)
router.get('/:id/next-available', getNextAvailable);

module.exports = router;
