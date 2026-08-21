/**
 * appointments.js — Appointment routes
 *
 * POST   /api/appointments     — Public (guest patient booking)
 * GET    /api/appointments     — Authenticated
 * GET    /api/appointments/:id — Authenticated
 * DELETE /api/appointments/:id — Authenticated (doctor/admin)
 *
 * Demonstrates: Express Router, middleware chaining, optional auth
 */

'use strict';

const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  deleteAppointment
} = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateAppointment } = require('../middleware/validate');

/**
 * optionalAuth — attempt to authenticate but don't fail if no token.
 * This allows POST /api/appointments to work for both guests and authenticated users.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token — continue as guest
    req.user = null;
    return next();
  }

  // Token present — attempt full authentication
  const { authenticate: fullAuth } = require('../middleware/auth');
  return fullAuth(req, res, next);
};

// POST /api/appointments — public guest booking (with optional auth)
router.post('/', optionalAuth, validateAppointment, createAppointment);

// GET /api/appointments — list (authenticated)
router.get('/', authenticate, getAppointments);

// GET /api/appointments/:id — detail (authenticated)
router.get('/:id', authenticate, getAppointmentById);

// DELETE /api/appointments/:id — cancel (authenticated doctor/admin)
router.delete('/:id', authenticate, authorize('doctor', 'admin'), deleteAppointment);

module.exports = router;
