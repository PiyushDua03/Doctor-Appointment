/**
 * seed.js — Database seed script
 *
 * Populates MongoDB with the EXISTING frontend data:
 *   - 6 doctors (from js/data/doctors.js)
 *   - 5 rooms (from js/data/rooms.js)
 *   - Doctor user accounts (with bcrypt-hashed passwords)
 *   - 1 admin user account
 *
 * Run with: node utils/seed.js
 *
 * Demonstrates: async/await, arrays, objects, destructuring,
 * .map(), .forEach(), try-catch, template literals, process.exit
 */

'use strict';

const mongoose = require('mongoose');
const config = require('../config/env');
const Doctor = require('../models/Doctor');
const Room = require('../models/Room');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

/* ──────────────────────────────────────
 * Seed Data — mirrors existing frontend exactly
 * ────────────────────────────────────── */

const doctors = [
  {
    doctorId: 'D1',
    name: 'Dr. Sharma',
    specialty: 'Cardiology',
    availableSlots: {
      monday:    [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
      tuesday:   [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
      wednesday: [{ start: '10:00', end: '14:00' }],
      thursday:  [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
      friday:    [{ start: '09:00', end: '12:00' }]
    },
    color: '#6C5CE7'
  },
  {
    doctorId: 'D2',
    name: 'Dr. Mehta',
    specialty: 'Dermatology',
    availableSlots: {
      monday:    [{ start: '10:00', end: '16:00' }],
      tuesday:   [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '13:00' }],
      thursday:  [{ start: '10:00', end: '16:00' }],
      friday:    [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '16:00' }],
      saturday:  [{ start: '10:00', end: '13:00' }]
    },
    color: '#00B894'
  },
  {
    doctorId: 'D3',
    name: 'Dr. Kapoor',
    specialty: 'Orthopedics',
    availableSlots: {
      monday:    [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '16:00' }],
      tuesday:   [{ start: '09:00', end: '14:00' }],
      wednesday: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
      thursday:  [{ start: '09:00', end: '13:00' }],
      friday:    [{ start: '08:00', end: '12:00' }]
    },
    color: '#E17055'
  },
  {
    doctorId: 'D4',
    name: 'Dr. Rao',
    specialty: 'General Medicine',
    availableSlots: {
      monday:    [{ start: '09:00', end: '17:00' }],
      tuesday:   [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday:  [{ start: '09:00', end: '17:00' }],
      friday:    [{ start: '09:00', end: '17:00' }],
      saturday:  [{ start: '09:00', end: '13:00' }]
    },
    color: '#0984E3'
  },
  {
    doctorId: 'D5',
    name: 'Dr. Patel',
    specialty: 'Cardiology',
    availableSlots: {
      monday:    [{ start: '10:00', end: '14:00' }],
      tuesday:   [{ start: '10:00', end: '14:00' }, { start: '15:00', end: '18:00' }],
      wednesday: [{ start: '09:00', end: '13:00' }],
      thursday:  [{ start: '10:00', end: '14:00' }],
      friday:    [{ start: '09:00', end: '12:00' }]
    },
    color: '#A29BFE'
  },
  {
    doctorId: 'D6',
    name: 'Dr. Gupta',
    specialty: 'Neurology',
    availableSlots: {
      monday:    [{ start: '09:00', end: '13:00' }],
      tuesday:   [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
      wednesday: [{ start: '10:00', end: '15:00' }],
      thursday:  [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '16:00' }],
      friday:    [{ start: '09:00', end: '13:00' }]
    },
    color: '#FDCB6E'
  }
];

const rooms = [
  { roomId: 'R1', name: 'Room 101', type: 'General',    floor: 1 },
  { roomId: 'R2', name: 'Room 102', type: 'General',    floor: 1 },
  { roomId: 'R3', name: 'Room 201', type: 'Cardiology', floor: 2 },
  { roomId: 'R4', name: 'Room 202', type: 'General',    floor: 2 },
  { roomId: 'R5', name: 'Room 301', type: 'Procedure',  floor: 3 }
];

/**
 * Doctor user accounts for development/testing.
 * Passwords are hashed by the User model pre-save hook.
 * These are DEVELOPMENT ONLY credentials.
 */
const doctorUsers = [
  { name: 'Dr. Sharma',  email: 'sharma@clinic.dev',  password: 'doctor123', role: 'doctor', doctorId: 'D1' },
  { name: 'Dr. Mehta',   email: 'mehta@clinic.dev',   password: 'doctor123', role: 'doctor', doctorId: 'D2' },
  { name: 'Dr. Kapoor',  email: 'kapoor@clinic.dev',  password: 'doctor123', role: 'doctor', doctorId: 'D3' },
  { name: 'Dr. Rao',     email: 'rao@clinic.dev',     password: 'doctor123', role: 'doctor', doctorId: 'D4' },
  { name: 'Dr. Patel',   email: 'patel@clinic.dev',   password: 'doctor123', role: 'doctor', doctorId: 'D5' },
  { name: 'Dr. Gupta',   email: 'gupta@clinic.dev',   password: 'doctor123', role: 'doctor', doctorId: 'D6' }
];

const adminUser = {
  name: 'Admin',
  email: 'admin@clinic.dev',
  password: 'admin123',
  role: 'admin',
  doctorId: null
};

/* ──────────────────────────────────────
 * Seed function
 * ────────────────────────────────────── */

const seed = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('[Seed] Connected to MongoDB.');

    // Clear existing data
    await Doctor.deleteMany({});
    await Room.deleteMany({});
    await User.deleteMany({});
    await Appointment.deleteMany({});
    console.log('[Seed] Cleared existing data (including appointments).');

    // Seed doctors
    await Doctor.insertMany(doctors);
    console.log(`[Seed] Inserted ${doctors.length} doctors.`);

    // Seed rooms
    await Room.insertMany(rooms);
    console.log(`[Seed] Inserted ${rooms.length} rooms.`);

    // Seed doctor user accounts (passwords hashed by pre-save hook)
    for (const userData of doctorUsers) {
      const user = new User(userData);
      await user.save();
    }
    console.log(`[Seed] Created ${doctorUsers.length} doctor accounts.`);

    // Seed admin account
    const admin = new User(adminUser);
    await admin.save();
    console.log('[Seed] Created admin account.');

    // Summary
    console.log('\n[Seed] ═══════════════════════════════════');
    console.log('[Seed] Database seeded successfully!');
    console.log('[Seed] ═══════════════════════════════════');
    console.log('[Seed]');
    console.log('[Seed] Development-only test credentials:');
    console.log('[Seed] ─────────────────────────────────');
    doctorUsers.forEach(({ name, email }) => {
      console.log(`[Seed]   ${name}: ${email} / doctor123`);
    });
    console.log(`[Seed]   Admin: ${adminUser.email} / admin123`);
    console.log('[Seed]');
    console.log('[Seed] WARNING: These are development-only credentials.');
    console.log('[Seed]          DO NOT use in production.');
    console.log('[Seed] ═══════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  }
};

seed();
