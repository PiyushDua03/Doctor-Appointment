/**
 * auth.js — Authentication & authorization middleware
 *
 * authenticate — verify JWT from Authorization header, attach req.user
 * authorize   — check req.user.role against allowed roles
 * requireSelf — for doctor endpoints, verify requesting user matches :id
 *
 * Demonstrates: middleware pattern, async/await, destructuring,
 * conditional logic, array .includes(), arrow functions, try-catch
 */

'use strict';

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const User = require('../models/User');

/**
 * authenticate — verify JWT and attach user to request.
 *
 * Expects: Authorization: Bearer <token>
 *
 * On success: req.user = { id, name, email, role, doctorId }
 * On failure: 401 Unauthenticated
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Authentication required. Please provide a valid token.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT
    const decoded = jwt.verify(token, jwtSecret);

    // Fetch user from database (ensures user still exists and is current)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'User no longer exists.'
      });
    }

    // Attach user info to request
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      doctorId: user.doctorId || null
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Invalid token.'
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Token has expired.'
      });
    }
    next(err);
  }
};

/**
 * authorize — restrict access to specific roles.
 *
 * Usage: authorize('doctor', 'admin')
 *
 * @param  {...string} roles — allowed roles
 * @returns {Function} middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: `Access denied. Required role: ${roles.join(' or ')}.`
      });
    }

    next();
  };
};

/**
 * requireSelf — for doctor endpoints, verify the requesting user's
 * doctorId matches the :id parameter in the URL.
 *
 * Admin users bypass this check.
 * A doctor MUST NOT access another doctor's data by changing the URL.
 */
const requireSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHENTICATED',
      message: 'Authentication required.'
    });
  }

  // Admins can access any doctor's data
  if (req.user.role === 'admin') {
    return next();
  }

  // Doctor must match their own ID
  const requestedDoctorId = req.params.id;
  const userDoctorId = req.user.doctorId;

  if (userDoctorId !== requestedDoctorId) {
    return res.status(403).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'You are not authorized to access this doctor\'s data.'
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  requireSelf
};
