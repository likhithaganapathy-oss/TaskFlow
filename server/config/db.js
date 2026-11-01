const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 * Supports connection caching across serverless function invocations (Vercel).
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    const msg = '[TaskFlow DB] MONGODB_URI is not set in environment variables.';
    console.error(msg);
    throw new Error(msg);
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .then((conn) => {
        console.log(`[TaskFlow DB] MongoDB Connected: ${conn.connection.host}`);
        return conn;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(`[TaskFlow DB] Connection Error: ${error.message}`);
    throw error;
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
