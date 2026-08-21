/**
 * validate.js — Request body validation middleware
 *
 * Validates appointment booking requests and auth requests.
 * Backend validation exists independently of frontend validation.
 *
 * Demonstrates: regex, conditionals, array methods, arrow functions,
 * string methods (.trim(), .match()), parseInt, template literals
 */

'use strict';

/**
 * Validate appointment creation request body.
 * Required: patientName, doctorId, date, startTime, duration
 */
const validateAppointment = (req, res, next) => {
  const { patientName, doctorId, date, startTime, duration } = req.body;
  const errors = [];

  // Required fields
  if (!patientName || (typeof patientName === 'string' && patientName.trim().length === 0)) {
    errors.push('Patient name is required.');
  }

  if (!doctorId) {
    errors.push('Doctor ID is required.');
  }

  if (!date) {
    errors.push('Date is required.');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('Date must be in YYYY-MM-DD format.');
  }

  if (!startTime) {
    errors.push('Start time is required.');
  } else if (!/^\d{2}:\d{2}$/.test(startTime)) {
    errors.push('Start time must be in HH:mm format.');
  }

  if (!duration) {
    errors.push('Duration is required.');
  } else {
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || ![15, 30, 45, 60].includes(durationNum)) {
      errors.push('Duration must be 15, 30, 45, or 60 minutes.');
    }
  }

  // Optional email validation
  if (req.body.patientEmail && typeof req.body.patientEmail === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.patientEmail.trim())) {
      errors.push('Invalid email format.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errors.join(' '),
      details: errors
    });
  }

  next();
};

/**
 * Validate registration request body.
 * Required: name, email, password
 */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || (typeof name === 'string' && name.trim().length === 0)) {
    errors.push('Name is required.');
  }

  if (!email) {
    errors.push('Email is required.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Invalid email format.');
    }
  }

  if (!password) {
    errors.push('Password is required.');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errors.join(' '),
      details: errors
    });
  }

  next();
};

/**
 * Validate login request body.
 * Required: email, password
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push('Email is required.');
  }

  if (!password) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: errors.join(' '),
      details: errors
    });
  }

  next();
};

module.exports = {
  validateAppointment,
  validateRegister,
  validateLogin
};
