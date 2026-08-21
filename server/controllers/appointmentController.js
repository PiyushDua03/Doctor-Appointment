/**
 * appointmentController.js — Appointment API controller
 *
 * Handles appointment creation (public guest booking), listing, detail, and cancellation.
 *
 * POST /api/appointments is PUBLIC — patients book as guests without JWT.
 * GET/DELETE require authentication.
 *
 * Demonstrates: async/await, destructuring, try-catch,
 * conditional logic, error forwarding, role-based data filtering
 */

'use strict';

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Room = require('../models/Room');
const { bookAppointment } = require('../services/appointmentService');

/**
 * POST /api/appointments
 *
 * Create a new appointment. PUBLIC endpoint (guest patient booking).
 * Full validation and conflict checking is handled by appointmentService.
 */
const createAppointment = async (req, res, next) => {
  try {
    const appointmentData = {
      ...req.body,
      // If an authenticated user is creating, link it
      createdBy: req.user ? req.user.id : null
    };

    const { appointment, calendar } = await bookAppointment(appointmentData);

    // Fetch doctor and room names for the response
    const doctor = await Doctor.findOne({ doctorId: appointment.doctorId });
    const room = await Room.findOne({ roomId: appointment.roomId });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: {
        ...appointment.toObject(),
        doctorName: doctor ? doctor.name : appointment.doctorId,
        roomName: room ? room.name : appointment.roomId
      },
      calendar: calendar || { synced: false, status: 'not_configured' }
    });
  } catch (err) {
    // appointmentService throws structured errors — forward them
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        error: err.code || 'ERROR',
        message: err.message,
        conflicts: err.conflictType ? {
          doctor: err.conflictType === 'doctor',
          room: err.conflictType === 'room'
        } : undefined,
        suggestion: err.suggestion || undefined,
        details: err.details || undefined
      });
    }
    next(err);
  }
};

/**
 * GET /api/appointments
 *
 * List appointments. Authenticated endpoint.
 * Returns data appropriate to the user's role:
 *   - doctor: only their appointments
 *   - admin: all appointments
 */
const getAppointments = async (req, res, next) => {
  try {
    const { date, status, doctorId } = req.query;
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'doctor') {
      // Doctors can only see their own appointments
      filter.doctorId = req.user.doctorId;
    } else if (req.user.role === 'admin') {
      // Admins can filter by doctor if specified
      if (doctorId) filter.doctorId = doctorId;
    }

    // Additional query filters
    if (date) filter.date = date;
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/appointments/:id
 *
 * Get a single appointment by MongoDB _id. Authenticated endpoint.
 * Doctors can only see their own appointments.
 */
const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'APPOINTMENT_NOT_FOUND',
        message: 'Appointment not found.'
      });
    }

    // Doctor can only see their own appointments
    if (req.user.role === 'doctor' && appointment.doctorId !== req.user.doctorId) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You are not authorized to view this appointment.'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/appointments/:id
 *
 * Cancel an appointment (set status to 'cancelled'). Authenticated endpoint.
 * - Doctor can cancel their own appointments
 * - Admin can cancel any appointment
 */
const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'APPOINTMENT_NOT_FOUND',
        message: 'Appointment not found.'
      });
    }

    // Authorization check
    if (req.user.role === 'doctor' && appointment.doctorId !== req.user.doctorId) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'You are not authorized to cancel this appointment.'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_CANCELLED',
        message: 'This appointment is already cancelled.'
      });
    }

    // Soft delete — set status to cancelled
    appointment.status = 'cancelled';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: appointment
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  deleteAppointment
};
