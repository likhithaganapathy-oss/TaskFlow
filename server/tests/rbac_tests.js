const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Task = require('../models/Task');
const authRoutes = require('../routes/authRoutes');
const taskRoutes = require('../routes/taskRoutes');
const adminRoutes = require('../routes/adminRoutes');
const { notFound, errorHandler } = require('../middleware/errorMiddleware');

const TEST_PORT = 5088;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

const runRBACTests = async () => {
  console.log('========================================================');
  console.log('🧪 TASKFLOW RBAC & DATA ISOLATION TEST SUITE');
  console.log('========================================================\n');

  const getDbName = (uri) => {
    try {
      const parsed = new URL(uri);
      return parsed.pathname.replace(/^\//, '').split('?')[0];
    } catch {
      const parts = (uri || '').split('/');
      const last = parts[parts.length - 1];
      return last ? last.split('?')[0] : '';
    }
  };

  const devDbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow';
  const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow_test';

  const testDbName = getDbName(testDbUri);
  const devDbName = getDbName(devDbUri);

  // Safety check 1: Refuse to run against the normal development or production database
  if (testDbUri === devDbUri && !testDbName.toLowerCase().includes('test')) {
    console.error('❌ SAFETY REFUSAL: Automated tests refuse to run against the normal development or production database!');
    console.error(`   Target URI: ${testDbUri} (matches MONGODB_URI)`);
    console.error('   Please define TEST_MONGODB_URI pointing to an isolated test database (e.g. mongodb://127.0.0.1:27017/taskflow_test).');
    process.exit(1);
  }

  // Safety check 2: Test database name must contain 'test'
  if (!testDbName.toLowerCase().includes('test')) {
    console.error(`❌ SAFETY REFUSAL: Test database name "${testDbName}" must contain "test" to prevent accidental data loss.`);
    console.error('   Please provide a dedicated TEST_MONGODB_URI with a database name containing "test".');
    process.exit(1);
  }

  console.log(`[Test Setup] Connecting to isolated test database: ${testDbName}...`);
  await mongoose.connect(testDbUri);
  console.log('[Test Setup] Connected to isolated test MongoDB database successfully.');

  // Setup test Express app
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
    // Clean up any previous test accounts
    await User.deleteMany({
      email: {
        $in: [
          'test_student_a@taskflow.edu',
          'test_student_b@taskflow.edu',
          'test_admin_user@taskflow.edu',
        ],
      },
    });

    // ------------------------------------------------------------------
    // TEST 1: Role Escalation Prevention on Registration
    // ------------------------------------------------------------------
    console.log('▶ Test 1: Privilege Escalation Prevention on Public Registration');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Alice',
        email: 'test_student_a@taskflow.edu',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'admin', // Malicious attempt to self-assign admin role
      }),
    });
    const regData = await regRes.json();
    const studentAliceDB = await User.findById(regData.user._id);

    if (studentAliceDB.role === 'student') {
      console.log('  ✅ PASS: Attempt to register with role="admin" was ignored; role is strictly "student".');
    } else {
      throw new Error(`Security breach: User successfully registered as ${studentAliceDB.role}!`);
    }
    const tokenStudentA = regData.token;

    // Register Student B
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Bob',
        email: 'test_student_b@taskflow.edu',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });
    const regBData = await regBRes.json();
    const tokenStudentB = regBData.token;

    // Create Admin User directly via DB (server-side setup)
    const adminUser = await User.create({
      name: 'Faculty Admin',
      email: 'test_admin_user@taskflow.edu',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    const tokenAdmin = jwt.sign(
      { id: adminUser._id },
      process.env.JWT_SECRET || 'super_secret_taskflow_jwt_key_default',
      { expiresIn: '1d' }
    );

    // ------------------------------------------------------------------
    // TEST 2: Task Creation & Ownership Isolation
    // ------------------------------------------------------------------
    console.log('\n▶ Test 2: Student Task Creation & Ownership Binding');
    const taskRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentA}`,
      },
      body: JSON.stringify({
        title: "Alice's Private Cryptography Homework",
        subject: 'Computer Science',
        dueDate: new Date(Date.now() + 86400000 * 3),
        priority: 'High',
        status: 'In Progress',
      }),
    });
    const taskData = await taskRes.json();
    const taskAId = taskData.task._id;
    console.log('  ✅ PASS: Student A created task:', taskData.task.title);

    // ------------------------------------------------------------------
    // TEST 3: Cross-Student Privacy (Student B cannot access Student A's task)
    // ------------------------------------------------------------------
    console.log('\n▶ Test 3: Cross-Student Access Denial');
    // Student B tries to fetch Alice's task
    const getTaskBRes = await fetch(`${BASE_URL}/tasks/${taskAId}`, {
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    console.log(`  Checking GET /api/tasks/${taskAId} with Student B token...`);
    if (getTaskBRes.status === 404 || getTaskBRes.status === 403) {
      console.log(`  ✅ PASS: Student B cannot view Student A's assignment (Returned ${getTaskBRes.status} Access Denied).`);
    } else {
      throw new Error(`Privacy breach: Student B accessed Alice's task with status ${getTaskBRes.status}`);
    }

    // Student B tries to update Alice's task
    const updateTaskBRes = await fetch(`${BASE_URL}/tasks/${taskAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudentB}`,
      },
      body: JSON.stringify({ title: 'Hacked by Bob' }),
    });
    if (updateTaskBRes.status === 404 || updateTaskBRes.status === 403) {
      console.log(`  ✅ PASS: Student B cannot edit Student A's assignment (Returned ${updateTaskBRes.status} Access Denied).`);
    } else {
      throw new Error(`Integrity breach: Student B modified Alice's task with status ${updateTaskBRes.status}`);
    }

    // Student B tries to delete Alice's task
    const delTaskBRes = await fetch(`${BASE_URL}/tasks/${taskAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenStudentB}` },
    });
    if (delTaskBRes.status === 404 || delTaskBRes.status === 403) {
      console.log(`  ✅ PASS: Student B cannot delete Student A's assignment (Returned ${delTaskBRes.status} Access Denied).`);
    } else {
      throw new Error(`Data loss breach: Student B deleted Alice's task with status ${delTaskBRes.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 4: RBAC Security Guard (HTTP 401 & HTTP 403 on Admin Routes)
    // ------------------------------------------------------------------
    console.log('\n▶ Test 4: Admin Endpoints Permission Enforcement');
    // 4.1 Unauthenticated request -> HTTP 401
    const unauthRes = await fetch(`${BASE_URL}/admin/stats`);
    if (unauthRes.status === 401) {
      console.log('  ✅ PASS: Unauthenticated request to /api/admin/stats returned HTTP 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }

    // 4.2 Student A request -> HTTP 403 Forbidden
    const studentAdminRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    if (studentAdminRes.status === 403) {
      console.log('  ✅ PASS: Student request to /api/admin/stats returned HTTP 403 Forbidden.');
    } else {
      throw new Error(`Expected 403 for student accessing admin route, got ${studentAdminRes.status}`);
    }

    const studentUsersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    if (studentUsersRes.status === 403) {
      console.log('  ✅ PASS: Student request to /api/admin/users returned HTTP 403 Forbidden.');
    } else {
      throw new Error(`Expected 403 for student accessing /api/admin/users, got ${studentUsersRes.status}`);
    }

    const studentTasksRes = await fetch(`${BASE_URL}/admin/tasks`, {
      headers: { Authorization: `Bearer ${tokenStudentA}` },
    });
    if (studentTasksRes.status === 403) {
      console.log('  ✅ PASS: Student request to /api/admin/tasks returned HTTP 403 Forbidden.');
    } else {
      throw new Error(`Expected 403 for student accessing /api/admin/tasks, got ${studentTasksRes.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 5: Admin Privileges & Cross-Student Operations
    // ------------------------------------------------------------------
    console.log('\n▶ Test 5: Administrator Operations');
    // Admin gets stats
    const adminStatsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const adminStatsData = await adminStatsRes.json();
    if (adminStatsRes.status === 200 && adminStatsData.stats.totalStudents >= 2) {
      console.log('  ✅ PASS: Admin successfully fetched institutional statistics.');
    } else {
      throw new Error(`Admin stats request failed with status ${adminStatsRes.status}`);
    }

    // Admin lists all students
    const adminUsersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const adminUsersData = await adminUsersRes.json();
    if (adminUsersRes.status === 200 && adminUsersData.students.length >= 2) {
      console.log(`  ✅ PASS: Admin retrieved all registered student accounts (${adminUsersData.students.length} students).`);
    } else {
      throw new Error(`Admin users request failed with status ${adminUsersRes.status}`);
    }

    // Admin views all tasks across students
    const adminAllTasksRes = await fetch(`${BASE_URL}/admin/tasks`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const adminAllTasksData = await adminAllTasksRes.json();
    const hasAliceTask = adminAllTasksData.tasks.some((t) => t._id.toString() === taskAId.toString());
    if (adminAllTasksRes.status === 200 && hasAliceTask) {
      console.log('  ✅ PASS: Admin can view all assignments across all students.');
    } else {
      throw new Error('Admin failed to locate Alice\'s task in global assignment feed');
    }

    // Admin updates Alice's task (e.g. adjusts priority or deadline)
    const adminUpdateTaskRes = await fetch(`${BASE_URL}/admin/tasks/${taskAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({ priority: 'Low' }),
    });
    const adminUpdateData = await adminUpdateTaskRes.json();
    if (adminUpdateTaskRes.status === 200 && adminUpdateData.task.priority === 'Low') {
      console.log('  ✅ PASS: Admin successfully updated task priority to Low.');
    } else {
      throw new Error(`Admin task update failed with status ${adminUpdateTaskRes.status}`);
    }

    // Admin deletes Alice's task
    const adminDeleteTaskRes = await fetch(`${BASE_URL}/admin/tasks/${taskAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    if (adminDeleteTaskRes.status === 200) {
      console.log('  ✅ PASS: Admin successfully deleted assignment.');
    } else {
      throw new Error(`Admin task deletion failed with status ${adminDeleteTaskRes.status}`);
    }

    // Clean up test accounts
    await Task.deleteMany({ user: { $in: [studentAliceDB._id, regBData.user._id, adminUser._id] } });
    await User.deleteMany({ _id: { $in: [studentAliceDB._id, regBData.user._id, adminUser._id] } });

    console.log('\n========================================================');
    console.log('🎉 ALL 5 RBAC & SECURITY TESTS PASSED PERFECTLY!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n❌ RBAC TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
};

runRBACTests();

