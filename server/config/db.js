const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 * Supports connection caching across warm serverless function invocations (e.g. on Vercel).
 */
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    console.error('[TaskFlow DB] MONGODB_URI is not set in environment variables.');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[TaskFlow DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[TaskFlow DB] Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

/**
 * Check if the database is currently connected.
 * 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, isConnected };
