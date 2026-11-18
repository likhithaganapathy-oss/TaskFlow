const express = require('express');
const router = express.Router();
const {
  getDailyPlan,
  getWeeklySchedule,
  saveDailyPlan,
  togglePlannedTask,
} = require('../controllers/studyPlanController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/daily', getDailyPlan);
router.get('/weekly', getWeeklySchedule);
router.post('/', saveDailyPlan);
router.patch('/:planId/task/:taskId', togglePlannedTask);

module.exports = router;
