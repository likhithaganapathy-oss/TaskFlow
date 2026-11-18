const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  submitTask,
  logStudyTime,
  getStudentAnalytics,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// All task routes require authentication
router.use(protect);

router.get('/analytics', getStudentAnalytics);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/status', updateTaskStatus);
router.post('/:id/submit', submitTask);
router.post('/:id/study-time', logStudyTime);

module.exports = router;
