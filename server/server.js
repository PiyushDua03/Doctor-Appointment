/**
 * server.js — Application entry point
 *
 * Flow: Load environment → Connect MongoDB → Start Express
 * Does not accept requests until database is connected.
 *
 * Demonstrates: async/await, module imports, process events,
 * environment variables, template literals
 */

'use strict';

// Load environment variables first
const config = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start Express server
    const server = app.listen(config.port, () => {
      console.log(`[Server] Running on port ${config.port} (${config.nodeEnv})`);
      console.log(`[Server] API base: http://localhost:${config.port}/api`);
      console.log(`[Server] Health check: http://localhost:${config.port}/api/health`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
