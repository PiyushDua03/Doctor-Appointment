/**
 * googleCalendarService.js — Google Calendar integration service
 *
 * Handles creating, updating, and deleting Google Calendar events
 * for booked appointments. Uses OAuth2 with refresh token for
 * server-side calendar access.
 *
 * ARCHITECTURE RULE:
 *   The scheduling engine is the SOURCE OF TRUTH.
 *   Google Calendar is a DOWNSTREAM consumer — it receives events
 *   AFTER the appointment has been validated and saved to MongoDB.
 *   Google Calendar NEVER decides whether an appointment can be booked.
 *
 * Demonstrates: async/await, try-catch, destructuring, template literals,
 * conditional logic, object construction, error handling, module pattern
 */

'use strict';

const { google } = require('googleapis');
const { clinicTimezone } = require('../config/env');

/* ──────────────────────────────────────
 * Configuration
 * ────────────────────────────────────── */

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

/**
 * Check if Google Calendar credentials are configured.
 * All three OAuth2 values must be present, plus a refresh token.
 * @returns {boolean}
 */
const isConfigured = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  return !!(clientId && clientSecret && redirectUri && refreshToken);
};

/**
 * Create an authenticated OAuth2 client using env credentials.
 * Uses a refresh token so no user consent flow is needed at runtime.
 * @returns {google.auth.OAuth2}
 */
const getAuthClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return oauth2Client;
};

/**
 * Get a Google Calendar API client instance.
 * @returns {google.calendar_v3.Calendar}
 */
const getCalendarClient = () => {
  const auth = getAuthClient();
  return google.calendar({ version: 'v3', auth });
};

/* ──────────────────────────────────────
 * Event helpers
 * ────────────────────────────────────── */

/**
 * Build a Google Calendar event object from appointment data.
 *
 * Timezone is set to CLINIC_TIMEZONE so the event represents
 * the same real-world time as the application's appointment.
 *
 * @param {Object} appointment — the saved appointment document
 * @param {string} doctorName — doctor's display name
 * @param {string} roomName — room's display name
 * @returns {Object} Google Calendar event resource
 */
const buildEventResource = (appointment, doctorName, roomName) => {
  const { patientName, specialty, date, startTime, endTime, duration } = appointment;
  const timezone = clinicTimezone || 'Asia/Kolkata';

  // Build RFC 3339 datetime strings with timezone
  // Format: "2026-08-21T10:00:00" with timeZone specified separately
  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;

  return {
    summary: `Doctor Appointment — ${doctorName}`,
    description: [
      `Patient: ${patientName}`,
      `Specialty: ${specialty || 'General'}`,
      `Doctor: ${doctorName}`,
      `Room: ${roomName}`,
      `Duration: ${duration} minutes`,
      '',
      'Booked via Multi-Doctor Appointment Scheduler'
    ].join('\n'),
    start: {
      dateTime: startDateTime,
      timeZone: timezone
    },
    end: {
      dateTime: endDateTime,
      timeZone: timezone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 }
      ]
    }
  };
};

/* ──────────────────────────────────────
 * Calendar operations
 * ────────────────────────────────────── */

/**
 * Create a Google Calendar event for a booked appointment.
 *
 * @param {Object} appointment — the saved Mongoose appointment document
 * @param {string} doctorName — doctor's display name
 * @param {string} roomName — room's display name
 * @returns {Promise<{ success: boolean, eventId?: string, error?: string }>}
 */
const createCalendarEvent = async (appointment, doctorName, roomName) => {
  // If Google Calendar is not configured, return gracefully
  if (!isConfigured()) {
    console.warn('[GoogleCalendar] Not configured — skipping event creation.');
    return {
      success: false,
      error: 'Google Calendar is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and GOOGLE_REFRESH_TOKEN in .env.'
    };
  }

  try {
    const calendar = getCalendarClient();
    const eventResource = buildEventResource(appointment, doctorName, roomName);

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const response = await calendar.events.insert({
      calendarId,
      resource: eventResource
    });

    const eventId = response.data.id;

    console.log(`[GoogleCalendar] Event created: ${eventId}`);

    return {
      success: true,
      eventId
    };
  } catch (err) {
    console.error('[GoogleCalendar] Failed to create event:', err.message);

    return {
      success: false,
      error: 'Failed to create Google Calendar event.'
    };
  }
};

/**
 * Delete a Google Calendar event by its event ID.
 *
 * @param {string} eventId — the Google Calendar event ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const deleteCalendarEvent = async (eventId) => {
  if (!isConfigured() || !eventId) {
    return { success: false, error: 'Not configured or no event ID.' };
  }

  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    await calendar.events.delete({
      calendarId,
      eventId
    });

    console.log(`[GoogleCalendar] Event deleted: ${eventId}`);
    return { success: true };
  } catch (err) {
    console.error('[GoogleCalendar] Failed to delete event:', err.message);
    return { success: false, error: 'Failed to delete Google Calendar event.' };
  }
};

/**
 * Update a Google Calendar event.
 *
 * @param {string} eventId — the Google Calendar event ID
 * @param {Object} appointment — updated appointment
 * @param {string} doctorName
 * @param {string} roomName
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const updateCalendarEvent = async (eventId, appointment, doctorName, roomName) => {
  if (!isConfigured() || !eventId) {
    return { success: false, error: 'Not configured or no event ID.' };
  }

  try {
    const calendar = getCalendarClient();
    const eventResource = buildEventResource(appointment, doctorName, roomName);
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    await calendar.events.update({
      calendarId,
      eventId,
      resource: eventResource
    });

    console.log(`[GoogleCalendar] Event updated: ${eventId}`);
    return { success: true };
  } catch (err) {
    console.error('[GoogleCalendar] Failed to update event:', err.message);
    return { success: false, error: 'Failed to update Google Calendar event.' };
  }
};

module.exports = {
  isConfigured,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  buildEventResource,
  getAuthClient,
  SCOPES
};
