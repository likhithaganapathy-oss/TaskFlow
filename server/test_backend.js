const db = require('./config/db');
const User = require('./models/User');
const Task = require('./models/Task');
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const authController = require('./controllers/authController');
const taskController = require('./controllers/taskController');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

console.log('✅ 1. All backend modules, models, controllers, and routes imported cleanly.');

// Test password hashing and bcrypt comparison logic offline
const bcrypt = require('bcryptjs');
const testPassword = 'SecretPassword123';
const salt = bcrypt.genSaltSync(10);
const hashed = bcrypt.hashSync(testPassword, salt);
const isMatch = bcrypt.compareSync(testPassword, hashed);
const isNotMatch = bcrypt.compareSync('WrongPassword', hashed);

if (isMatch && !isNotMatch) {
  console.log('✅ 2. Password security (bcryptjs salt, hash, and match verification) working correctly.');
} else {
  throw new Error('Password verification check failed');
}

// Test JWT token generation and verification offline
const jwt = require('jsonwebtoken');
const secret = 'test_jwt_secret_key_123';
const token = jwt.sign({ id: '65f0123456789abcdef01234' }, secret, { expiresIn: '1h' });
const decoded = jwt.verify(token, secret);

if (decoded && decoded.id === '65f0123456789abcdef01234') {
  console.log('✅ 3. JWT token generation and signature verification working correctly.');
} else {
  throw new Error('JWT token verification check failed');
}

// Test Task schema validation rules offline
const sampleTask = new Task({
  createdBy: '65f0123456789abcdef01234',
  title: 'Database Assignment 1',
  subject: 'Computer Science',
  dueDate: new Date(Date.now() + 86400000 * 3),
  priority: 'High',
  scope: 'personal',
});

const validationError = sampleTask.validateSync();
if (!validationError) {
  console.log('✅ 4. Task Mongoose Schema validation rules passed for valid data.');
} else {
  throw new Error('Task validation failed: ' + validationError.message);
}

// Test invalid enum rejection
const invalidTask = new Task({
  createdBy: '65f0123456789abcdef01234',
  title: 'Math Test',
  subject: 'Mathematics',
  dueDate: new Date(),
  priority: 'UltraHigh', // Invalid enum
  scope: 'invalid_scope', // Invalid enum
});
const invalidErr = invalidTask.validateSync();
if (invalidErr && invalidErr.errors.priority && invalidErr.errors.scope) {
  console.log('✅ 5. Task Mongoose Schema strictly rejects invalid priority/scope enum values.');
} else {
  throw new Error('Expected enum validation failure did not trigger');
}

console.log('\n🎉 ALL BACKEND CHECKS AND UNIT TESTS PASSED SUCCESSFULLY!');

