/**
 * errorHandler.js — Global Express error handler
 *
 * Catches all errors and returns structured JSON responses.
 * Never exposes stack traces or database internals in production.
 *
 * Demonstrates: conditional logic, switch statement, object construction,
 * error handling patterns, template literals
 */

'use strict';

const { nodeEnv } = require('../config/env');

/**
 * Global error handler middleware.
 * Must have 4 parameters (err, req, res, next) for Express to recognize it.
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let status = err.status || err.statusCode || 500;
  let code = err.code || 'SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    const details = Object.values(err.errors).map((e) => e.message);
    message = details.join(' ');
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Handle Mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid value for ${err.path}: ${err.value}`;
  }

  // Build response
  const response = {
    success: false,
    error: code,
    message
  };

  // Include conflict details if present
  if (err.conflicts) {
    response.conflicts = err.conflicts;
  }

  // Include suggestion if present (for scheduling conflicts)
  if (err.suggestion) {
    response.suggestion = err.suggestion;
  }

  // Include validation details if present
  if (err.details) {
    response.details = err.details;
  }

  // Include conflict type if present
  if (err.conflictType) {
    response.conflictType = err.conflictType;
  }

  // Include stack trace only in development
  if (nodeEnv === 'development' && status === 500) {
    response.stack = err.stack;
  }

  // Log server errors
  if (status >= 500) {
    console.error(`[Error] ${status} ${code}: ${message}`);
    if (nodeEnv === 'development') {
      console.error(err.stack);
    }
  }

  res.status(status).json(response);
};

module.exports = errorHandler;
