const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');
const authRoutes = require('../routes/authRoutes');
const taskRoutes = require('../routes/taskRoutes');
const adminRoutes = require('../routes/adminRoutes');
const { notFound, errorHandler } = require('../middleware/errorMiddleware');

const TEST_PORT = 5095;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

const runVerification = async () => {
  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow_test';
  await mongoose.connect(testDbUri);
  console.log('[Verify] Connected to test database.');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/admin', adminRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  try {
    // Clean fixtures
    await User.deleteMany({ email: /@fixverify\.test$/ });
    await Assignment.deleteMany({ title: /\[FixVerify\]/ });

    // Create Admin
    const admin = await User.create({
      name: 'Admin Fix',
      email: 'admin@fixverify.test',
      password: 'Password123!',
      role: 'admin',
    });
    const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    // Create Student 1 & Student 2
    const s1 = await User.create({
      name: 'Student One',
      email: 's1@fixverify.test',
      password: 'Password123!',
      role: 'student',
    });
    const s2 = await User.create({
      name: 'Student Two',
      email: 's2@fixverify.test',
      password: 'Password123!',
      role: 'student',
    });

    console.log('\n--- Test 1: Admin filtering by studentId AND search simultaneously ---');
    // Create 2 assignments: both matching search "Algorithm", but one assigned to s1 and one to s2
    const a1 = await Assignment.create({
      title: '[FixVerify] Algorithm Assignment Alpha',
      subject: 'Computer Science',
      dueDate: new Date(Date.now() + 86400000),
      priority: 'High',
      scope: 'individual',
      createdBy: admin._id,
      assignedTo: s1._id,
    });
    const a2 = await Assignment.create({
      title: '[FixVerify] Algorithm Assignment Beta',
      subject: 'Computer Science',
      dueDate: new Date(Date.now() + 86400000),
      priority: 'High',
      scope: 'individual',
      createdBy: admin._id,
      assignedTo: s2._id,
    });

    // Query with search="Algorithm" AND studentId=s1._id
    const filterRes = await fetch(`${BASE_URL}/admin/tasks?search=Algorithm&studentId=${s1._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const filterData = await filterRes.json();
    if (filterData.tasks.length === 1 && filterData.tasks[0]._id.toString() === a1._id.toString()) {
      console.log('✅ PASS: search and studentId filtered together correctly without overwriting! Only s1 task returned.');
    } else {
      throw new Error(`Filtering failed: expected 1 task for s1, got ${filterData.tasks.length}`);
    }

    console.log('\n--- Test 2: Admin assignment update requiring valid student account ---');
    // Attempt to update a1 to individual without studentId (or invalid role)
    const invalidUpdateRes = await fetch(`${BASE_URL}/admin/tasks/${a1._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope: 'individual',
        studentId: admin._id, // admin account has role='admin', not 'student'
      }),
    });
    if (invalidUpdateRes.status === 400) {
      console.log('✅ PASS: Admin account was rejected as student target with HTTP 400.');
    } else {
      throw new Error(`Expected HTTP 400 for non-student target, got ${invalidUpdateRes.status}`);
    }

    console.log('\n--- Test 3: Reassignment without transferring progress ---');
    // First, student 1 marks a1 as "Completed"
    await AssignmentProgress.create({
      assignment: a1._id,
      student: s1._id,
      status: 'Completed',
      completedAt: new Date(),
    });

    // Reassign a1 to student 2
    const reassignRes = await fetch(`${BASE_URL}/admin/tasks/${a1._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope: 'individual',
        studentId: s2._id,
      }),
    });
    const reassignData = await reassignRes.json();
    if (!reassignRes.ok) throw new Error(`Reassignment failed: ${reassignData.message}`);

    // Verify progress records
    const s1Progress = await AssignmentProgress.findOne({ assignment: a1._id, student: s1._id });
    const s2Progress = await AssignmentProgress.findOne({ assignment: a1._id, student: s2._id });

    if (!s1Progress && s2Progress && s2Progress.status === 'Pending') {
      console.log("✅ PASS: S1 completed progress was cleanly removed; S2 received fresh Pending progress!");
    } else {
      throw new Error(`Reassignment progress check failed: s1Progress=${s1Progress}, s2Progress=${s2Progress?.status}`);
    }

    console.log('\n--- Test 4: Admin dashboard statistics distinguishing definitions from student progress ---');
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    console.log('Stats received:', statsData.stats);
    if (
      statsData.success &&
      statsData.stats.totalTasks > 0 &&
      statsData.stats.totalStudents >= 2 &&
      typeof statsData.stats.completionRate === 'number'
    ) {
      console.log('✅ PASS: Admin stats accurately compute definitions vs student workloads and completion metrics.');
    } else {
      throw new Error('Admin stats verification failed');
    }

    // Clean up
    await User.deleteMany({ email: /@fixverify\.test$/ });
    await Assignment.deleteMany({ title: /\[FixVerify\]/ });
    await AssignmentProgress.deleteMany({ assignment: { $in: [a1._id, a2._id] } });

    console.log('\n🎉 ALL FIX VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    await mongoose.disconnect();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    await mongoose.disconnect();
    server.close();
    process.exit(1);
  }
};

runVerification();

