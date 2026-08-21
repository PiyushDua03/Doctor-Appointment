/**
 * Doctor.js — Doctor model matching existing frontend data structure
 *
 * Mirrors the doctor objects from js/data/doctors.js exactly:
 *   { id, name, specialty, availableSlots: { monday: [{start, end}], ... }, color }
 *
 * Demonstrates: Mongoose schema, nested objects, mixed types, unique index
 */

'use strict';

const mongoose = require('mongoose');

/**
 * Time window sub-schema for availability slots.
 * Each slot has a start and end time in "HH:mm" format.
 */
const timeWindowSchema = new mongoose.Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true
    },
    availableSlots: {
      monday: [timeWindowSchema],
      tuesday: [timeWindowSchema],
      wednesday: [timeWindowSchema],
      thursday: [timeWindowSchema],
      friday: [timeWindowSchema],
      saturday: [timeWindowSchema],
      sunday: [timeWindowSchema]
    },
    color: {
      type: String,
      default: '#888888'
    },
    photoUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
