/**
 * app.js — Express application setup
 *
 * Configures middleware, mounts routes, and attaches error handler.
 * Does NOT start the server — that's handled by server.js.
 *
 * Demonstrates: middleware chaining, route mounting, module composition,
 * CORS configuration, security headers
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Route modules
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');

// Error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();

/* ──────────────────────────────────────
 * Security & Parsing Middleware
 * ────────────────────────────────────── */

// Security headers — CSP disabled since frontend and API are same-origin
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS — allow frontend to call API
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: false }));

/* ──────────────────────────────────────
 * Routes
 * ────────────────────────────────────── */

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running.',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/upload', require('./routes/upload'));

// Static frontend files — serve from project root (index disabled so landing.html route handles /)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'landing.html'));
});

// Patient booking
app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'booking-api.html'));
});

// Doctor routes — redirect to admin portal (single login)
app.get('/doctor/login', (req, res) => {
  res.redirect('/admin/login');
});

app.get('/doctor/dashboard', (req, res) => {
  res.redirect('/admin/dashboard');
});

// Admin routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin-dashboard.html'));
});

// 404 handler for unknown routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found.`
  });
});

/* ──────────────────────────────────────
 * Error Handler (must be last)
 * ────────────────────────────────────── */

app.use(errorHandler);

module.exports = app;
