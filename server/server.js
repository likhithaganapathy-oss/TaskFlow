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
  console.error('');
  console.error('Generate one with:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('');
  console.error('Then add it to server/.env:');
  console.error('  JWT_SECRET=<your_generated_secret>');
  console.error('=========================================================');
  process.exit(1);
}

// Connect to MongoDB Atlas or local MongoDB
connectDB();

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
app.get('/api/health', (req, res) => {
  const dbConnected = isConnected();
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    success: dbConnected,
    status: dbConnected ? 'healthy' : 'unhealthy',
    message: dbConnected
      ? 'TaskFlow API is operating normally.'
      : 'TaskFlow API is running but the database is unavailable.',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for root route
app.get('/', (req, res) => {
  res.send('TaskFlow Backend API is running. Access endpoints via /api/');
});

// Ensure database is connected on incoming requests (handles serverless cold starts)
app.use(async (req, res, next) => {
  if (!isConnected() && process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('[DB Middleware Error]:', err.message);
    }
  }
  next();
});

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
