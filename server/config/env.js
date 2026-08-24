/**
 * env.js — Centralized environment variable loader
 *
 * Loads .env file and exports configuration values.
 * Demonstrates: destructuring, default values, object export
 */

'use strict';

const dotenv = require('dotenv');
const path = require('path');

// Load .env from the server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doctor_appointment',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_me',
  port: parseInt(process.env.PORT, 10) || 5000,
  clinicTimezone: process.env.CLINIC_TIMEZONE || 'Asia/Kolkata',
  nodeEnv: process.env.NODE_ENV || 'development',
  // Google Calendar (Phase 3B) — values come from .env
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID || 'primary'
};

module.exports = config;
