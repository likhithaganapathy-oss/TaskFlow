const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');

/**
 * Migration Script: Migrate legacy Task documents to the new Assignment & AssignmentProgress models.
 * 
 * Safety & Design Features:
 * - 100% Idempotent: Safely skips documents that have already been migrated.
 * - Non-destructive: Leaves the legacy `tasks` collection completely untouched.
 * - ID Preservation: Preserves the exact same MongoDB ObjectId (_id) for every task.
 * - Progress Decoupling: Generates corresponding student progress records with existing completion states.
 */
async function migrateTasks() {
  console.log('========================================================');
  console.log('📦 TASKFLOW MIGRATION: Tasks -> Assignments & Progress');
  console.log('========================================================\n');

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing from server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Migration] Connected to MongoDB database.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hasTasksCollection = collections.some((c) => c.name === 'tasks');

    if (!hasTasksCollection) {
      console.log('ℹ️ No legacy "tasks" collection found. Nothing to migrate.');
      await mongoose.disconnect();
      return process.exit(0);
    }

    const legacyTasks = await db.collection('tasks').find({}).toArray();
    console.log(`[Migration] Found ${legacyTasks.length} legacy task record(s) to inspect.\n`);

    let migratedAssignments = 0;
    let skippedAssignments = 0;
    let createdProgress = 0;
    let skippedProgress = 0;
    const errors = [];

    for (const task of legacyTasks) {
      try {
        if (!task.user || !task.title || !task.dueDate) {
          errors.push({ id: task._id, reason: 'Missing required fields (user, title, or dueDate)' });
          continue;
        }

        // Check if user exists to determine appropriate scope
        const taskUser = await User.findById(task.user);
        const scope = taskUser && taskUser.role === 'admin' ? 'all' : 'personal';

        // 1. Migrate Assignment Definition
        const existingAssignment = await Assignment.findById(task._id);
        if (!existingAssignment) {
          await Assignment.collection.insertOne({
            _id: task._id,
            title: task.title,
            subject: task.subject || 'General',
            description: task.description || '',
            dueDate: new Date(task.dueDate),
            priority: ['High', 'Medium', 'Low'].includes(task.priority) ? task.priority : 'Medium',
            scope: task.scope || scope,
            createdBy: task.user,
            assignedTo: task.assignedTo || (scope === 'personal' ? task.user : null),
            createdAt: task.createdAt || new Date(),
            updatedAt: task.updatedAt || new Date(),
          });
          migratedAssignments++;
        } else {
          skippedAssignments++;
        }

        // 2. Migrate Student Progress Record
        if (task.user) {
          const existingProgress = await AssignmentProgress.findOne({
            assignment: task._id,
            student: task.user,
          });

          if (!existingProgress) {
            const status = ['Pending', 'In Progress', 'Completed'].includes(task.status)
              ? task.status
              : 'Pending';

            await AssignmentProgress.create({
              assignment: task._id,
              student: task.user,
              status,
              completedAt: status === 'Completed' ? (task.updatedAt || new Date()) : null,
              createdAt: task.createdAt || new Date(),
              updatedAt: task.updatedAt || new Date(),
            });
            createdProgress++;
          } else {
            skippedProgress++;
          }
        }
      } catch (docErr) {
        errors.push({ id: task._id, reason: docErr.message });
      }
    }

    console.log('--------------------------------------------------------');
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`   - Assignments created: ${migratedAssignments}`);
    console.log(`   - Assignments already present (skipped): ${skippedAssignments}`);
    console.log(`   - Progress records created: ${createdProgress}`);
    console.log(`   - Progress records already present (skipped): ${skippedProgress}`);
    console.log(`   - Records with errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('   Errors detail:', JSON.stringify(errors, null, 2));
    }
    console.log('--------------------------------------------------------');
    console.log('✅ Migration completed safely and idempotently.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateTasks();

