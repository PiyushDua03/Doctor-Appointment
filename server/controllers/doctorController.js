/**
 * doctorController.js — Doctor API controller
 *
 * Handles doctor listing, detail view, appointment access, and next-available slot.
 *
 * Demonstrates: async/await, destructuring, .find(), .filter(),
 * populate, query parameters, conditional logic, error handling
 */

'use strict';

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Room = require('../models/Room');
const { findNextAvailableSlot } = require('../services/slotService');
const { getTodayISO } = require('../services/timeUtils');

/**
 * GET /api/doctors
 *
 * List all doctors. Public endpoint.
 * Optionally filter by specialty via query parameter.
 */
const getDoctors = async (req, res, next) => {
  try {
    const { specialty } = req.query;
    const filter = specialty ? { specialty } : {};

    const doctors = await Doctor.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctors/:id
 *
 * Get a single doctor by doctorId. Public endpoint.
 */
const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOne({ doctorId: id });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID '${id}' not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctors/:id/appointments
 *
 * Get appointments for a specific doctor.
 * PROTECTED: Only the authenticated doctor (or admin) can access their own appointments.
 * Authorization is enforced by requireSelf middleware.
 */
const getDoctorAppointments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, status } = req.query;

    // Verify doctor exists
    const doctor = await Doctor.findOne({ doctorId: id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID '${id}' not found.`
      });
    }

    // Build query filter
    const filter = { doctorId: id };
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
 * GET /api/doctors/:id/next-available
 *
 * Find the next available slot for a doctor.
 * Public endpoint — used by the booking flow.
 *
 * Query parameters:
 *   date     — start date for search (default: today)
 *   duration — appointment duration in minutes (default: 30)
 *   from     — earliest start time on first day (default: "08:00")
 */
const getNextAvailable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      date = getTodayISO(),
      duration = '30',
      from = '08:00'
    } = req.query;

    const durationMins = parseInt(duration, 10);

    // Validate duration
    if (isNaN(durationMins) || ![15, 30, 45, 60].includes(durationMins)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Duration must be 15, 30, 45, or 60 minutes.'
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Date must be in YYYY-MM-DD format.'
      });
    }

    // Get all required data
    const doctors = await Doctor.find().lean();
    const rooms = await Room.find().lean();
    const appointments = await Appointment.find({
      status: 'confirmed'
    }).lean();

    // Verify doctor exists
    const doctor = doctors.find((d) => d.doctorId === id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID '${id}' not found.`
      });
    }

    // Use the existing next-available algorithm
    const slot = findNextAvailableSlot(
      id, date, from, durationMins, rooms, doctors, appointments
    );

    if (slot) {
      res.status(200).json({
        success: true,
        data: {
          available: true,
          doctorId: id,
          doctorName: doctor.name,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          roomId: slot.roomId,
          duration: durationMins
        }
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          available: false,
          doctorId: id,
          doctorName: doctor.name,
          message: 'No available slots found within the next 7 days.'
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Convert availability array to availableSlots object.
 * Input:  [{ day: "Monday", start: "09:00", end: "17:00" }]
 * Output: { monday: [{ start: "09:00", end: "17:00" }], ... }
 */
const convertAvailability = (availability) => {
  const slots = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of days) { slots[day] = []; }

  if (Array.isArray(availability)) {
    for (const slot of availability) {
      const key = slot.day.toLowerCase();
      if (slots[key] !== undefined) {
        slots[key].push({ start: slot.start, end: slot.end });
      }
    }
  }
  return slots;
};

/**
 * POST /api/doctors — Create a new doctor (admin only)
 */
const createDoctor = async (req, res, next) => {
  try {
    const { doctorId, name, specialty, availability, photoUrl } = req.body;

    if (!doctorId || !name || !specialty) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'doctorId, name, and specialty are required.'
      });
    }

    const existing = await Doctor.findOne({ doctorId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE',
        message: `Doctor with ID '${doctorId}' already exists.`
      });
    }

    const availableSlots = convertAvailability(availability || []);
    const docData = { doctorId, name, specialty, availableSlots };
    if (photoUrl) docData.photoUrl = photoUrl;

    const doctor = await Doctor.create(docData);
    res.status(201).json({ success: true, data: doctor });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/doctors/:id — Update a doctor (admin only)
 */
const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Convert availability array to availableSlots format
    if (updates.availability) {
      updates.availableSlots = convertAvailability(updates.availability);
      delete updates.availability;
    }

    const doctor = await Doctor.findOneAndUpdate(
      { doctorId: id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID '${id}' not found.`
      });
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/doctors/:id — Delete a doctor (admin only)
 */
const deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findOneAndDelete({ doctorId: id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID '${id}' not found.`
      });
    }

    res.status(200).json({ success: true, message: `Doctor ${doctor.name} deleted.` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  getDoctorAppointments,
  getNextAvailable,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
