/**
 * Appointment.js — Appointment model matching existing frontend structure
 *
 * Mirrors the appointment objects from js/models/appointment.js:
 *   { id, patientName, doctorId, specialty, roomId, date, startTime, endTime, duration, status, createdAt }
 *
 * Demonstrates: Mongoose schema, enum, default values, references, indexes
 */

'use strict';

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true
    },
    patientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    doctorId: {
      type: String,
      required: [true, 'Doctor ID is required'],
      index: true
    },
    specialty: {
      type: String,
      default: ''
    },
    roomId: {
      type: String,
      required: [true, 'Room ID is required'],
      index: true
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      index: true
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required']
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required']
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed'
    },
    // Google Calendar synchronization tracking
    googleCalendarEventId: {
      type: String,
      default: null
    },
    calendarSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'not_configured'],
      default: 'pending'
    },
    // Reference to the user who created this appointment
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient conflict queries
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });
appointmentSchema.index({ roomId: 1, date: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
