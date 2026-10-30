const dotenv = require('dotenv');
// Load environment variables before anything else
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server immediately
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Application UI: http://localhost:${PORT}/`);
    });

    connectDB().catch((err) => {
      console.error(`⚠️ MongoDB connection pending or unavailable: ${err.message}`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error(`❌ Unhandled Rejection: ${err.message}`);
      // Close server & exit process in production
      if (process.env.NODE_ENV === 'production') {
        server.close(() => process.exit(1));
      }
    });

    // Handle Uncaught Exceptions
    process.on('uncaughtException', (err) => {
      console.error(`❌ Uncaught Exception: ${err.message}`);
      if (process.env.NODE_ENV === 'production') {
        server.close(() => process.exit(1));
      }
    });
  } catch (error) {
    console.error(`❌ Server Initialization Failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
