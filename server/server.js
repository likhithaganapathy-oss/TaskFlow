const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, isConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables from .env file
dotenv.config();

// ── Security: require JWT_SECRET at startup ────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('=========================================================');
  console.error('FATAL: JWT_SECRET is not set in the environment variables.');
  console.error('=========================================================');
  process.exit(1);
}

// Kick off initial connection asynchronously
connectDB().catch((err) => {
  console.warn('[DB Init Warning]:', err.message);
});

const app = express();

// ── CORS: allow all origins with credentials ───────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check: reports database connectivity accurately ─────────────
app.get('/api/health', async (req, res) => {
  let dbError = null;
  if (!isConnected()) {
    try {
      await connectDB();
    } catch (err) {
      dbError = err.message;
    }
  }
  const dbConnected = isConnected();
  const statusCode = dbConnected ? 200 : 503;

  // Mask credentials in MONGODB_URI to inspect host safely
  let maskedUri = 'NOT_SET';
  if (process.env.MONGODB_URI) {
    maskedUri = process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
  }

  res.status(statusCode).json({
    success: dbConnected,
    status: dbConnected ? 'healthy' : 'unhealthy',
    message: dbConnected
      ? 'TaskFlow API is operating normally.'
      : `TaskFlow API is running but database is unavailable: ${dbError || 'Not connected'}`,
    database: dbConnected ? 'connected' : 'disconnected',
    targetDb: maskedUri,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Fallback for root route
app.get('/', (req, res) => {
  res.send('TaskFlow Backend API is running. Access endpoints via /api/');
});

// ── Critical: Ensure DB is connected BEFORE routing API requests ───────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Middleware Error]:', err.message);
    return res.status(503).json({
      success: false,
      message: `Database connection error: ${err.message}. Please check MongoDB Atlas connection.`,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

// Centralized error handling
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 TaskFlow Backend Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
