const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const connectDB = require('./src/Backend/Config/db');
const routes = require('./src/Backend/Routes');
const { notFound, errorHandler } = require('./src/Backend/Middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Ensures all scripts and stylesheets load smoothly
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets & Frontend Presentation Tier
const rootFrontend = path.join(__dirname, 'frontend');
const frontendDir = path.join(__dirname, 'src/Frontend');
const templatesDir = path.join(frontendDir, 'Templates');
const stylesDir = path.join(frontendDir, 'styles');
const scriptsDir = path.join(frontendDir, 'Scripts');
const assetsDir = path.join(__dirname, 'Assets');

// Mount static asset directories with aliases
app.use('/styles', express.static(stylesDir));
app.use('/css', express.static(stylesDir));
app.use('/css', express.static(path.join(rootFrontend, 'css')));
app.use('/Scripts', express.static(scriptsDir));
app.use('/scripts', express.static(scriptsDir));
app.use('/js', express.static(scriptsDir));
app.use('/js', express.static(path.join(rootFrontend, 'js')));
app.use('/Assets', express.static(assetsDir));
app.use('/assets', express.static(assetsDir));
app.use('/Templates', express.static(templatesDir));
app.use('/templates', express.static(templatesDir));

// Serve templates & root frontend directory at root for direct page access
app.use(express.static(rootFrontend));
app.use(express.static(templatesDir));
app.use(express.static(frontendDir));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(templatesDir, 'index.html'));
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DoctorP Appointment API',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Telehealth Cross-Tab & Cross-Device Real-Time Signaling Store (WebRTC Offer/Answer/ICE)
const activeTelehealthSignals = {};

app.post('/api/telehealth/signal', (req, res) => {
  const signal = req.body;
  if (signal && signal.appointmentId) {
    if (!activeTelehealthSignals[signal.appointmentId]) {
      activeTelehealthSignals[signal.appointmentId] = [];
    }
    const signalItem = {
      ...signal,
      sigId: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      serverTime: Date.now(),
    };
    activeTelehealthSignals[signal.appointmentId].push(signalItem);
    // Keep max 60 signals
    if (activeTelehealthSignals[signal.appointmentId].length > 60) {
      activeTelehealthSignals[signal.appointmentId].shift();
    }
    return res.status(200).json({ success: true, signal: signalItem });
  }
  res.status(200).json({ success: true });
});

app.get('/api/telehealth/signal', (req, res) => {
  res.status(200).json({ success: true, signals: activeTelehealthSignals });
});

app.get('/api/telehealth/signal/:appointmentId', (req, res) => {
  const aptId = req.params.appointmentId;
  const since = parseInt(req.query.since || '0', 10);
  const queue = activeTelehealthSignals[aptId] || [];
  const signals = since ? queue.filter((s) => s.serverTime > since) : queue;
  res.status(200).json({ success: true, signals });
});

app.delete('/api/telehealth/signal/:appointmentId', (req, res) => {
  const aptId = req.params.appointmentId;
  if (aptId && activeTelehealthSignals[aptId]) {
    delete activeTelehealthSignals[aptId];
  }
  res.status(200).json({ success: true, message: 'Signal cleared' });
});

// Mount Central API Routes
app.use('/api', routes);

// 404 & Centralized Error Handlers for API
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return notFound(req, res, next);
  }
  next();
});
app.use(errorHandler);

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
  } catch (error) {
    console.error(`❌ Server Initialization Failed: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
