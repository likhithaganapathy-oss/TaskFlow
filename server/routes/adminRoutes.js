const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllStudents,
  createStudent,
  updateStudent,
  toggleStudentStatus,
  deleteStudent,
  getAllTasks,
  createTaskForStudent,
  updateTaskByAdmin,
  gradeSubmission,
  getSubmissions,
  deleteTaskByAdmin,
  sendAnnouncement,
} = require('../controllers/adminController');
const {
  getSubmissionMonitoring,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getReportData,
} = require('../controllers/adminAdvancedController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All admin routes strictly require authentication and the 'admin' role
router.use(protect);
router.use(adminOnly);

// System overview stats
router.get('/stats', getAdminStats);

// Student accounts management
router.route('/users')
  .get(getAllStudents)
  .post(createStudent);

router.route('/users/:id')
  .put(updateStudent)
  .delete(deleteStudent);

router.patch('/users/:id/status', toggleStudentStatus);

// Announcements
router.post('/announcements', sendAnnouncement);

// Submission Monitoring Overview
router.get('/submissions/overview', getSubmissionMonitoring);

// Institutional Calendar Events
router.route('/calendar/events')
  .get(getCalendarEvents)
  .post(createCalendarEvent);

router.delete('/calendar/events/:id', deleteCalendarEvent);

// Report Generation
router.get('/reports/:type', getReportData);

// Institutional task management
router.route('/tasks')
  .get(getAllTasks)
  .post(createTaskForStudent);

router.route('/tasks/:id')
  .put(updateTaskByAdmin)
  .delete(deleteTaskByAdmin);

router.get('/tasks/:id/submissions', getSubmissions);
router.post('/tasks/:id/grade', gradeSubmission);

module.exports = router;
