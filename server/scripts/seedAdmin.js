const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Load environment variables from server root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const seedAdmin = async () => {
  // ── Require explicit environment values — no fallbacks ──────────────
  if (!process.env.ADMIN_EMAIL) {
    console.error('❌ ADMIN_EMAIL is not defined in server/.env');
    console.error('   Set it before running this script.');
    process.exit(1);
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD is not defined in server/.env');
    console.error('   Set a strong password (8+ chars) before running this script.');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in server/.env');
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[RBAC Setup] Connected to MongoDB.');

    // Check if account already exists
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      if (existing.role === 'admin') {
        console.log(`✅ Administrator account already exists: ${adminEmail}`);
        console.log('   No changes were made. Password was NOT reset.');
      } else {
        // Only promote role — do NOT reset the password
        existing.role = 'admin';
        await existing.save();
        console.log(`✅ Existing account promoted to administrator: ${adminEmail}`);
        console.log('   Password was NOT changed.');
      }
    } else {
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      console.log(`✅ Administrator account created: ${adminEmail}`);
    }

    console.log('----------------------------------------------------');
    console.log('Role:    admin');
    console.log('Email:  ', adminEmail);
    console.log('----------------------------------------------------');
    console.log('🔒 Security: Never share admin credentials. Rotate them periodically.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed administrator account:', error.message);
    process.exit(1);
  }
};

seedAdmin();
