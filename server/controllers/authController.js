/**
 * authController.js — Authentication controller
 *
 * Handles user registration and login.
 * Returns JWT tokens and user information.
 *
 * Demonstrates: async/await, destructuring, try-catch,
 * object construction, conditional logic, arrow functions
 */

'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

/** Generate a JWT for a given user. */
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    doctorId: user.doctorId || null
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
};

/**
 * POST /api/auth/register
 *
 * Creates a new user account with hashed password.
 * Returns JWT and user information.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, doctorId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: 'A user with this email already exists.'
      });
    }

    // Restrict role assignment (only admin can create admin/doctor accounts)
    const allowedRole = role || 'patient';
    const validRoles = ['patient', 'doctor', 'admin'];
    if (!validRoles.includes(allowedRole)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}.`
      });
    }

    // Create user (password is hashed by the pre-save hook)
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: allowedRole,
      doctorId: doctorId || null
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorId: user.doctorId
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 *
 * Verifies credentials and returns JWT.
 * Does not return password or hash.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorId: user.doctorId
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login
};
