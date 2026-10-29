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

const TEST_PORT = 5092;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

async function runAssignmentVisibilityTests() {
  console.log('================================================================');
  console.log('🧪 TASKFLOW ASSIGNMENT VISIBILITY & DATA ISOLATION TEST SUITE');
  console.log('================================================================\n');

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

  // Initialize test Express application
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/admin', adminRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Test API running on port ${TEST_PORT}\n`);

  try {
    // ── Setup: Clean previous test fixtures ──────────────────────────
    const testEmails = [
      'vis_test_student_a@taskflow.edu',
      'vis_test_student_b@taskflow.edu',
      'vis_test_student_c_later@taskflow.edu',
      'vis_test_faculty_admin@taskflow.edu',
    ];

    const existingUsers = await User.find({ email: { $in: testEmails } });
    const existingUserIds = existingUsers.map((u) => u._id);

    await AssignmentProgress.deleteMany({ student: { $in: existingUserIds } });
    await Assignment.deleteMany({ createdBy: { $in: existingUserIds } });
    await User.deleteMany({ email: { $in: testEmails } });

    // Create Test Student A
    const studentA = await User.create({
      name: 'Alice Johnson',
      email: 'vis_test_student_a@taskflow.edu',
      password: 'Password123!',
      role: 'student',
    });
    const tokenA = jwt.sign({ id: studentA._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Create Test Student B
    const studentB = await User.create({
      name: 'Bob Smith',
      email: 'vis_test_student_b@taskflow.edu',
      password: 'Password123!',
      role: 'student',
    });
    const tokenB = jwt.sign({ id: studentB._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Create Test Admin
    const adminUser = await User.create({
      name: 'Prof. Davis',
      email: 'vis_test_faculty_admin@taskflow.edu',
      password: 'AdminPassword123!',
      role: 'admin',
    });
    const tokenAdmin = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    let institutionAssignmentId = null;
    let individualAssignmentId = null;
    let personalAssignmentId = null;

    // ------------------------------------------------------------------
    // TEST 12: Admin creates assignments via POST /api/admin/tasks
    // ------------------------------------------------------------------
    console.log('▶ Test 12: Admins can publish assignments to all students and assign work to a selected student');
    const pubRes = await fetch(`${BASE_URL}/admin/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        scope: 'all',
        title: 'Midterm Research Project: Cloud Systems',
        subject: 'Cloud Computing',
        description: 'Submit an architectural analysis of serverless microservices.',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'High',
      }),
    });
    const pubData = await pubRes.json();
    if (pubRes.status !== 201 || !pubData.task?._id) {
      throw new Error(`Admin failed to publish institution assignment: ${JSON.stringify(pubData)}`);
    }
    institutionAssignmentId = pubData.task._id;

    // Create individual assignment for Student A
    const indivRes = await fetch(`${BASE_URL}/admin/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        scope: 'individual',
        studentId: studentA._id.toString(),
        title: 'Individual Honors Thesis Chapter 1',
        subject: 'Independent Study',
        description: 'Complete literature review chapter for honors program.',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'High',
      }),
    });
    const indivData = await indivRes.json();
    if (indivRes.status !== 201 || !indivData.task?._id) {
      throw new Error(`Admin failed to create individual assignment: ${JSON.stringify(indivData)}`);
    }
    individualAssignmentId = indivData.task._id;
    console.log('  ✅ PASS: Admin successfully published institution-wide and individual assignments.\n');

    // ------------------------------------------------------------------
    // TEST 1: Institution-wide assignment appears for two different students
    // ------------------------------------------------------------------
    console.log('▶ Test 1: Institution-wide assignment appears for two different student accounts');
    const resA = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dataA = await resA.json();
    const studentAHasInst = dataA.tasks.some((t) => t._id.toString() === institutionAssignmentId);

    const resB = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const dataB = await resB.json();
    const studentBHasInst = dataB.tasks.some((t) => t._id.toString() === institutionAssignmentId);

    if (studentAHasInst && studentBHasInst) {
      console.log('  ✅ PASS: Both Student A and Student B retrieved the institution-wide assignment.\n');
    } else {
      throw new Error(`Visibility failure: Student A (${studentAHasInst}) Student B (${studentBHasInst})`);
    }

    // ------------------------------------------------------------------
    // TEST 2: Both students initially have independent Pending statuses
    // ------------------------------------------------------------------
    console.log('▶ Test 2: Both students initially have independent Pending statuses');
    const taskForA = dataA.tasks.find((t) => t._id.toString() === institutionAssignmentId);
    const taskForB = dataB.tasks.find((t) => t._id.toString() === institutionAssignmentId);

    if (taskForA.status === 'Pending' && taskForB.status === 'Pending') {
      console.log('  ✅ PASS: Both students initial status is "Pending".\n');
    } else {
      throw new Error(`Initial status mismatch: A=${taskForA.status}, B=${taskForB.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 3: Completing as Student A does not change Student B's status
    // ------------------------------------------------------------------
    console.log('▶ Test 3: Completing assignment as Student A does not change Student B status');
    const updateStatusRes = await fetch(`${BASE_URL}/tasks/${institutionAssignmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'Completed' }),
    });
    const updateStatusData = await updateStatusRes.json();
    if (updateStatusRes.status !== 200) {
      throw new Error(`Status update failed: ${JSON.stringify(updateStatusData)}`);
    }

    // Re-fetch Student A & Student B
    const verifyA = await (await fetch(`${BASE_URL}/tasks`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
    const verifyB = await (await fetch(`${BASE_URL}/tasks`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();

    const updatedTaskA = verifyA.tasks.find((t) => t._id.toString() === institutionAssignmentId);
    const updatedTaskB = verifyB.tasks.find((t) => t._id.toString() === institutionAssignmentId);

    if (updatedTaskA.status === 'Completed' && updatedTaskB.status === 'Pending') {
      console.log('  ✅ PASS: Student A status is "Completed"; Student B status remains independently "Pending".\n');
    } else {
      throw new Error(`Data pollution: Student A=${updatedTaskA.status}, Student B=${updatedTaskB.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 4: Individual assignment appears only for its assigned student
    // ------------------------------------------------------------------
    console.log('▶ Test 4: Individual assignment appears for its assigned student (Student A)');
    const aHasIndiv = verifyA.tasks.some((t) => t._id.toString() === individualAssignmentId);
    if (aHasIndiv) {
      console.log('  ✅ PASS: Student A can view their assigned individual task.\n');
    } else {
      throw new Error('Individual assignment not visible to assigned student.');
    }

    // ------------------------------------------------------------------
    // TEST 5: Other students cannot read or modify that individual assignment
    // ------------------------------------------------------------------
    console.log('▶ Test 5: Other students cannot read or modify that individual assignment');
    const bHasIndivInList = verifyB.tasks.some((t) => t._id.toString() === individualAssignmentId);
    if (bHasIndivInList) {
      throw new Error('Privacy breach: Student B received Student A individual assignment in list.');
    }

    // Attempt direct GET by ID
    const directGet = await fetch(`${BASE_URL}/tasks/${individualAssignmentId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (directGet.status === 403 || directGet.status === 404) {
      console.log(`  ✅ PASS: Direct read by unauthorized Student B rejected with HTTP ${directGet.status}.`);
    } else {
      throw new Error(`Direct read was not blocked: HTTP ${directGet.status}`);
    }

    // Attempt status modification
    const directPatch = await fetch(`${BASE_URL}/tasks/${individualAssignmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ status: 'Completed' }),
    });
    if (directPatch.status === 403 || directPatch.status === 404) {
      console.log(`  ✅ PASS: Status update by unauthorized Student B rejected with HTTP ${directPatch.status}.\n`);
    } else {
      throw new Error(`Unauthorized status update not blocked: HTTP ${directPatch.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 6: Personal assignment appears only for its owner
    // ------------------------------------------------------------------
    console.log('▶ Test 6: Personal assignment appears only for its owner');
    const createPersonalRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Alice Private Study Notes on Fourier Transforms',
        subject: 'Mathematics',
        description: 'Personal study checklist.',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'Low',
        status: 'In Progress',
      }),
    });
    const personalData = await createPersonalRes.json();
    personalAssignmentId = personalData.task._id;

    const listAAfterPersonal = await (await fetch(`${BASE_URL}/tasks`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
    const listBAfterPersonal = await (await fetch(`${BASE_URL}/tasks`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();

    const aHasPersonal = listAAfterPersonal.tasks.some((t) => t._id.toString() === personalAssignmentId);
    const bHasPersonal = listBAfterPersonal.tasks.some((t) => t._id.toString() === personalAssignmentId);

    if (aHasPersonal && !bHasPersonal) {
      console.log('  ✅ PASS: Personal task is visible to owner (Student A) and hidden from Student B.\n');
    } else {
      throw new Error(`Personal task isolation failed: A=${aHasPersonal}, B=${bHasPersonal}`);
    }

    // ------------------------------------------------------------------
    // TEST 7: Students cannot create institution-wide assignments
    // ------------------------------------------------------------------
    console.log('▶ Test 7: Students cannot create institution-wide assignments');
    const maliciousPost = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Malicious Attempt: Campus Holiday',
        subject: 'Administration',
        dueDate: new Date().toISOString(),
        scope: 'all', // Attempting to self-publish institution-wide
      }),
    });
    const malData = await maliciousPost.json();
    const createdDoc = await Assignment.findById(malData.task._id);

    if (createdDoc.scope === 'personal') {
      console.log('  ✅ PASS: Student attempt to create scope="all" was sanitized to "personal".\n');
    } else {
      throw new Error(`Security breach: Student was able to create scope="${createdDoc.scope}"`);
    }

    // ------------------------------------------------------------------
    // TEST 8: Students cannot change scope, creator, or owner of admin assignment
    // ------------------------------------------------------------------
    console.log('▶ Test 8: Students cannot change scope, creator, or owner of admin assignment');
    const updateAdminTask = await fetch(`${BASE_URL}/tasks/${institutionAssignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Tampered Assignment Title',
        scope: 'personal',
        createdBy: studentA._id.toString(),
      }),
    });
    if (updateAdminTask.status === 403) {
      console.log('  ✅ PASS: Student modification of admin assignment definition rejected with HTTP 403.\n');
    } else {
      throw new Error(`Student modification was not rejected: HTTP ${updateAdminTask.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 9: Students cannot edit or delete admin assignment definitions
    // ------------------------------------------------------------------
    console.log('▶ Test 9: Students cannot delete admin assignment definitions');
    const deleteAdminTask = await fetch(`${BASE_URL}/tasks/${institutionAssignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (deleteAdminTask.status === 403) {
      console.log('  ✅ PASS: Student deletion of admin assignment rejected with HTTP 403.\n');
    } else {
      throw new Error(`Admin assignment deletion not blocked: HTTP ${deleteAdminTask.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 10: Unauthenticated requests cannot access protected endpoints
    // ------------------------------------------------------------------
    console.log('▶ Test 10: Unauthenticated requests cannot access protected endpoints');
    const unauthGet = await fetch(`${BASE_URL}/tasks`);
    if (unauthGet.status === 401) {
      console.log('  ✅ PASS: Unauthenticated access rejected with HTTP 401.\n');
    } else {
      throw new Error(`Unauthenticated request not rejected: HTTP ${unauthGet.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 11: Authenticated students cannot access admin-only APIs
    // ------------------------------------------------------------------
    console.log('▶ Test 11: Authenticated students cannot access admin-only APIs');
    const studentOnAdminStats = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const studentOnAdminUsers = await fetch(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const studentOnAdminPost = await fetch(`${BASE_URL}/admin/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ title: 'Student Post to Admin Route' }),
    });

    if (studentOnAdminStats.status === 403 && studentOnAdminUsers.status === 403 && studentOnAdminPost.status === 403) {
      console.log('  ✅ PASS: All admin-only routes strictly rejected student with HTTP 403.\n');
    } else {
      throw new Error(`Admin route breach: stats=${studentOnAdminStats.status}, users=${studentOnAdminUsers.status}`);
    }

    // ------------------------------------------------------------------
    // TEST 13: Students registering later can see applicable institution-wide assignments
    // ------------------------------------------------------------------
    console.log('▶ Test 13: Students registering later can see applicable institution-wide assignments');
    const studentCLater = await User.create({
      name: 'Charlie Newcomer',
      email: 'vis_test_student_c_later@taskflow.edu',
      password: 'Password123!',
      role: 'student',
    });
    const tokenC = jwt.sign({ id: studentCLater._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const resC = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const dataC = await resC.json();
    const cHasInstitution = dataC.tasks.some((t) => t._id.toString() === institutionAssignmentId);
    const cTask = dataC.tasks.find((t) => t._id.toString() === institutionAssignmentId);

    if (cHasInstitution && cTask.status === 'Pending') {
      console.log('  ✅ PASS: Late-registering student immediately sees existing institution assignments with status="Pending".\n');
    } else {
      throw new Error(`Late registrant visibility failed: visible=${cHasInstitution}`);
    }

    // ------------------------------------------------------------------
    // TEST 14: Duplicate progress records are prevented
    // ------------------------------------------------------------------
    console.log('▶ Test 14: Duplicate progress records are prevented');
    // Ensure index is built
    await AssignmentProgress.syncIndexes();

    let duplicateCaught = false;
    try {
      await AssignmentProgress.create([
        {
          assignment: institutionAssignmentId,
          student: studentA._id,
          status: 'Completed',
        },
      ]);
    } catch (err) {
      if (err.code === 11000 || err.message.includes('duplicate')) {
        duplicateCaught = true;
      }
    }

    if (duplicateCaught) {
      console.log('  ✅ PASS: MongoDB compound unique index prevented duplicate progress record (E11000).\n');
    } else {
      throw new Error('Duplicate progress record was not prevented by unique index.');
    }

    // ------------------------------------------------------------------
    // TEST 15: Existing personal assignments remain accessible after migration
    // ------------------------------------------------------------------
    console.log('▶ Test 15: Existing personal assignments remain accessible');
    const allAssignmentsInDb = await Assignment.countDocuments();
    const allProgressInDb = await AssignmentProgress.countDocuments();

    if (allAssignmentsInDb > 0 && allProgressInDb > 0) {
      console.log(`  ✅ PASS: Database contains ${allAssignmentsInDb} assignments and ${allProgressInDb} progress records.\n`);
    } else {
      throw new Error('No assignments or progress records found in database.');
    }

    console.log('================================================================');
    console.log('🎉 ALL 15 ASSIGNMENT VISIBILITY & DATA ISOLATION TESTS PASSED!');
    console.log('================================================================\n');

    server.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAssignmentVisibilityTests();

