const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 * Admin provisioning is handled exclusively by scripts/seedAdmin.js — never here.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[TaskFlow DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[TaskFlow DB] Connection Error: ${error.message}`);
    console.error(`[TaskFlow DB] Hint: Check your MONGODB_URI in server/.env.`);
    console.error(`[TaskFlow DB] If using MongoDB Atlas, ensure:`);
    console.error(`  1. Your IP address is added to Atlas Network Access (or 0.0.0.0/0 for testing)`);
    console.error(`  2. The database user password is correct and URL-encoded if it contains special characters`);
    console.error(`  3. Or run a local MongoDB instance on mongodb://127.0.0.1:27017/taskflow`);
    process.exit(1);
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
