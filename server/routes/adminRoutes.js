const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAllStudents,
  deleteStudent,
  getAllTasks,
  createTaskForStudent,
  updateTaskByAdmin,
  deleteTaskByAdmin,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All admin routes strictly require authentication and the 'admin' role
router.use(protect);
router.use(adminOnly);

// System overview stats
router.get('/stats', getAdminStats);

// Student accounts management
router.get('/users', getAllStudents);
router.delete('/users/:id', deleteStudent);

// Institutional task management
router.route('/tasks')
  .get(getAllTasks)
  .post(createTaskForStudent);

router.route('/tasks/:id')
  .put(updateTaskByAdmin)
  .delete(deleteTaskByAdmin);

module.exports = router;

