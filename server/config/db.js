/**
 * db.js — MongoDB connection using Mongoose
 *
 * Demonstrates: async/await, try-catch, template literals,
 * process event handling, conditional logging
 */

'use strict';

const mongoose = require('mongoose');
const { mongoUri } = require('./env');

/**
 * Connect to MongoDB.
 * Retries are handled by Mongoose internally.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// Log disconnection events
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected.');
});

module.exports = connectDB;
