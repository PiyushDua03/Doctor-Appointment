/**
 * appointmentService.js — Orchestrates appointment booking with full validation
 *
 * Implements the validation + booking + calendar pipeline:
 *  1. Validate request body fields
 *  2. Validate patient name
 *  3. Validate doctor exists
 *  4. Validate room (auto-assign if not specified)
 *  5. Validate date is not in the past
 *  6. Validate date within 7-day window
 *  7. Calculate end time from duration
 *  8. Validate slot within doctor's availability window
 *  9. Check doctor conflicts
 * 10. Check room conflicts
 * 11. Reject if either resource is unavailable (with suggestion)
 * 12. Save appointment to MongoDB
 * 13. Create Google Calendar event (downstream — never blocks booking)
 * 14. Store calendar event ID and sync status
 *
 * Demonstrates: async/await, destructuring, conditionals, error objects,
 * function composition, arrays, template literals
 */

'use strict';

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Room = require('../models/Room');
const { timeToMinutes, minutesToTime, calculateEndTime, getDayOfWeek,
        getDateRange, getTodayISO, isDateInPast, isTimeInWindow, getDurations } = require('./timeUtils');
const { findDoctorConflicts, findRoomConflicts } = require('./conflictService');
const { assignRoom } = require('./roomService');
const { findNextAvailableSlot } = require('./slotService');
const { createCalendarEvent, isConfigured: isCalendarConfigured } = require('./googleCalendarService');

/**
 * Book an appointment with full validation and conflict checking.
 *
 * @param {Object} data — appointment request body
 * @param {Object|null} user — authenticated user (from JWT)
 * @returns {Promise<Object>} — { appointment } on success
 * @throws {Object} — { status, code, message, suggestion? } on failure
 */
const bookAppointment = async (data) => {
  const { doctorId, patientName, date, startTime, duration, roomId: requestedRoomId } = data;
  const errors = [];

  // ── Step 1 & 2: Validate required fields ──────────
  if (!doctorId) errors.push('Doctor ID is required.');
  if (!patientName || (typeof patientName === 'string' && patientName.trim().length === 0)) {
    errors.push('Patient name is required.');
  }
  if (!date) errors.push('Date is required.');
  if (!startTime) errors.push('Start time is required.');
  if (!duration) errors.push('Duration is required.');

  if (errors.length > 0) {
    const err = new Error(errors.join(' '));
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    err.details = errors;
    throw err;
  }

  const durationMins = parseInt(duration, 10);

  // ── Step 3: Validate doctor exists ────────────────
  const doctor = await Doctor.findOne({ doctorId });
  if (!doctor) {
    const err = new Error(`Doctor with ID '${doctorId}' not found.`);
    err.status = 404;
    err.code = 'DOCTOR_NOT_FOUND';
    throw err;
  }

  // ── Step 5: Validate date not in the past ─────────
  if (isDateInPast(date)) {
    const err = new Error('Cannot book appointments in the past.');
    err.status = 400;
    err.code = 'DATE_IN_PAST';
    throw err;
  }

  // ── Step 6: Validate date within 7-day window ─────
  const today = getTodayISO();
  const maxDates = getDateRange(today, 7);
  const lastDate = maxDates[maxDates.length - 1];
  if (date > lastDate) {
    const err = new Error(`Date must be within the next 7 days (up to ${lastDate}).`);
    err.status = 400;
    err.code = 'DATE_OUT_OF_RANGE';
    throw err;
  }

  // ── Step 7: Calculate end time ────────────────────
  const validDurations = getDurations();
  if (!validDurations.includes(durationMins)) {
    const err = new Error(`Duration must be one of: ${validDurations.join(', ')} minutes.`);
    err.status = 400;
    err.code = 'INVALID_DURATION';
    throw err;
  }

  const startMins = timeToMinutes(startTime);
  const endMins = startMins + durationMins;
  const endTime = minutesToTime(endMins);

  if (endMins <= startMins) {
    const err = new Error('End time must be after start time.');
    err.status = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  // ── Step 8: Validate slot within doctor's availability ──
  const dayName = getDayOfWeek(date);
  const windows = doctor.availableSlots[dayName];

  if (!windows || windows.length === 0) {
    const err = new Error(`${doctor.name} is not available on ${dayName}s.`);
    err.status = 400;
    err.code = 'DOCTOR_UNAVAILABLE_DAY';
    throw err;
  }

  if (!isTimeInWindow(startTime, endTime, windows)) {
    const windowStr = windows.map(({ start, end }) => `${start}–${end}`).join(', ');
    const err = new Error(
      `Requested time ${startTime}–${endTime} is outside ${doctor.name}'s hours (${windowStr}) on ${dayName}s.`
    );
    err.status = 400;
    err.code = 'OUTSIDE_AVAILABILITY';
    throw err;
  }

  // ── Steps 9 & 10: Check doctor + room conflicts ──
  // Fetch all active appointments for this date to check conflicts
  const existingAppointments = await Appointment.find({
    date,
    status: 'confirmed'
  }).lean();

  // Step 9: Doctor conflicts
  const doctorConflicts = findDoctorConflicts(
    doctorId, date, startTime, endTime, existingAppointments
  );

  if (doctorConflicts.length > 0) {
    // Find a suggestion
    const rooms = await Room.find().lean();
    const doctors = await Doctor.find().lean();

    const suggestion = findNextAvailableSlot(
      doctorId, date, startTime, durationMins, rooms, doctors, existingAppointments
    );

    const err = new Error('The selected doctor is unavailable at this time.');
    err.status = 409;
    err.code = 'APPOINTMENT_CONFLICT';
    err.conflictType = 'doctor';
    err.conflicts = doctorConflicts.map(({ startTime, endTime, patientName }) => ({
      startTime, endTime, patientName
    }));
    err.suggestion = suggestion ? {
      available: true,
      date: suggestion.date,
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      roomId: suggestion.roomId
    } : { available: false };
    throw err;
  }

  // ── Step 4 & 10: Validate/assign room and check room conflicts ──
  const allRooms = await Room.find().lean();
  let assignedRoomId = requestedRoomId;

  if (requestedRoomId) {
    // Validate that the specified room exists
    const room = allRooms.find((r) => r.roomId === requestedRoomId);
    if (!room) {
      const err = new Error(`Room with ID '${requestedRoomId}' not found.`);
      err.status = 404;
      err.code = 'ROOM_NOT_FOUND';
      throw err;
    }

    // Check room conflicts
    const roomConflicts = findRoomConflicts(
      requestedRoomId, date, startTime, endTime, existingAppointments
    );

    if (roomConflicts.length > 0) {
      const doctors = await Doctor.find().lean();
      const suggestion = findNextAvailableSlot(
        doctorId, date, startTime, durationMins, allRooms, doctors, existingAppointments
      );

      const err = new Error('The selected room is unavailable at this time.');
      err.status = 409;
      err.code = 'APPOINTMENT_CONFLICT';
      err.conflictType = 'room';
      err.suggestion = suggestion ? {
        available: true,
        date: suggestion.date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        roomId: suggestion.roomId
      } : { available: false };
      throw err;
    }
  } else {
    // Auto-assign a room (first-fit strategy)
    assignedRoomId = assignRoom(
      doctorId, date, startTime, endTime, allRooms, existingAppointments
    );

    if (!assignedRoomId) {
      const doctors = await Doctor.find().lean();
      const suggestion = findNextAvailableSlot(
        doctorId, date, startTime, durationMins, allRooms, doctors, existingAppointments
      );

      const err = new Error('No rooms available at this time.');
      err.status = 409;
      err.code = 'APPOINTMENT_CONFLICT';
      err.conflictType = 'room';
      err.suggestion = suggestion ? {
        available: true,
        date: suggestion.date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        roomId: suggestion.roomId
      } : { available: false };
      throw err;
    }
  }

  // ── Step 12: Save appointment ─────────────────────
  const appointment = new Appointment({
    patientName: patientName.trim(),
    patientEmail: data.patientEmail ? data.patientEmail.trim().toLowerCase() : null,
    doctorId,
    specialty: data.specialty || doctor.specialty,
    roomId: assignedRoomId,
    date,
    startTime,
    endTime,
    duration: durationMins,
    status: 'confirmed',
    createdBy: data.createdBy || null
  });

  await appointment.save();

  // ── Step 13 & 14: Google Calendar sync (downstream) ──
  // Calendar sync happens AFTER save — never blocks or reverses the booking.
  const room = allRooms.find((r) => r.roomId === assignedRoomId);
  const roomName = room ? room.name : assignedRoomId;
  const calendarResult = await syncCalendarEvent(appointment, doctor.name, roomName);

  return { appointment, calendar: calendarResult };
};

/**
 * Sync a saved appointment to Google Calendar.
 * Updates the appointment document with the sync result.
 *
 * If Google Calendar is not configured, marks status as 'not_configured'.
 * If the API call fails, marks status as 'failed'.
 * The appointment remains valid in MongoDB regardless.
 *
 * @param {Object} appointment — saved Mongoose appointment document
 * @param {string} doctorName
 * @param {string} roomName
 * @returns {Promise<Object>} — { synced, status, message?, eventId? }
 */
const syncCalendarEvent = async (appointment, doctorName, roomName) => {
  // Check if Google Calendar is configured
  if (!isCalendarConfigured()) {
    appointment.calendarSyncStatus = 'not_configured';
    await appointment.save();

    return {
      synced: false,
      status: 'not_configured',
      message: 'Google Calendar is not configured.'
    };
  }

  try {
    const result = await createCalendarEvent(appointment, doctorName, roomName);

    if (result.success) {
      appointment.googleCalendarEventId = result.eventId;
      appointment.calendarSyncStatus = 'synced';
      await appointment.save();

      return {
        synced: true,
        status: 'synced',
        eventId: result.eventId
      };
    } else {
      appointment.calendarSyncStatus = 'failed';
      await appointment.save();

      return {
        synced: false,
        status: 'failed',
        message: 'Appointment booked, but calendar synchronization failed.'
      };
    }
  } catch (err) {
    console.error('[AppointmentService] Calendar sync error:', err.message);

    appointment.calendarSyncStatus = 'failed';
    await appointment.save();

    return {
      synced: false,
      status: 'failed',
      message: 'Appointment booked, but calendar synchronization failed.'
    };
  }
};

module.exports = {
  bookAppointment,
  syncCalendarEvent
};
