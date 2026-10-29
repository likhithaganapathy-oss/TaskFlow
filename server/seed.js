const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Assignment = require('./models/Assignment');
const AssignmentProgress = require('./models/AssignmentProgress');

dotenv.config();

const seedData = async () => {
  // ── Safety: only run in development ─────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Seed script is disabled in production. Set NODE_ENV=development to run.');
    process.exit(1);
  }

  console.log('⚠️  This script creates demo accounts and sample assignments for DEVELOPMENT use.');
  console.log('   It will NOT delete existing data — it uses non-destructive create-or-skip.');
  console.log('');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow');
    console.log('[Seed] Connected to MongoDB.');

    // Upsert demo student — only create if not already present
    let demoStudent = await User.findOne({ email: 'student@college.edu' });

    if (!demoStudent) {
      demoStudent = await User.create({
        name: 'Demo Student',
        email: 'student@college.edu',
        password: 'Password123',
        role: 'student',
      });
      console.log(`[Seed] Created demo student: student@college.edu`);
    } else {
      console.log(`[Seed] Demo student already exists: student@college.edu (skipped)`);
    }

    // Only create sample assignments if this demo student has none
    const existingTaskCount = await Assignment.countDocuments({
      createdBy: demoStudent._id,
      scope: 'personal',
    });

    if (existingTaskCount === 0) {
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      const sampleAssignments = [
        {
          title: 'Implement Dijkstra Graph Algorithm in Python',
          subject: 'Computer Science',
          description: 'Complete the shortest-path graph traversal implementation and add PyTest unit test cases.',
          dueDate: threeDaysLater,
          priority: 'High',
          status: 'In Progress',
        },
        {
          title: 'Relational Database Normalization (3NF & BCNF)',
          subject: 'Database Systems',
          description: 'Decompose unnormalized relation schemas into 3NF and verify functional dependency preservation.',
          dueDate: sevenDaysLater,
          priority: 'Medium',
          status: 'Pending',
        },
        {
          title: 'Classical Mechanics Harmonic Oscillator Lab Report',
          subject: 'Physics',
          description: 'Draft lab conclusions with error propagation curves for damped oscillation.',
          dueDate: twoDaysAgo,
          priority: 'High',
          status: 'Pending',
        },
        {
          title: 'Linear Algebra Eigenvalues Problem Set',
          subject: 'Mathematics',
          description: 'Solve problem set exercises 4.1 through 4.5 on characteristic polynomials and diagonalization.',
          dueDate: tenDaysLater,
          priority: 'Low',
          status: 'Completed',
        },
      ];

      for (const item of sampleAssignments) {
        const assignment = await Assignment.create({
          title: item.title,
          subject: item.subject,
          description: item.description,
          dueDate: item.dueDate,
          priority: item.priority,
          scope: 'personal',
          createdBy: demoStudent._id,
          assignedTo: demoStudent._id,
        });

        await AssignmentProgress.create({
          assignment: assignment._id,
          student: demoStudent._id,
          status: item.status,
          completedAt: item.status === 'Completed' ? new Date() : null,
        });
      }

      console.log(`[Seed] Added ${sampleAssignments.length} sample personal assignments with progress for demo student.`);
    } else {
      console.log(`[Seed] Demo student already has ${existingTaskCount} personal tasks (skipped).`);
    }

    // Optionally check if an institution-wide assignment exists
    const institutionCount = await Assignment.countDocuments({ scope: 'all' });
    if (institutionCount === 0) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        await Assignment.create({
          title: 'Institution Orientation & Honor Code Acknowledgment',
          subject: 'Academic Integrity',
          description: 'Read the college honor code policy and acknowledge receipt before the add/drop deadline.',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          priority: 'High',
          scope: 'all',
          createdBy: adminUser._id,
        });
        console.log('[Seed] Added sample institution-wide assignment.');
      }
    }

    console.log('\n✅ Demo student credentials:');
    console.log('   Email:    student@college.edu');
    console.log('   Password: Password123');
    console.log('=====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error.message);
    process.exit(1);
  }
};

seedData();
