const StudyPlan = require('../models/StudyPlan');
const AssignmentProgress = require('../models/AssignmentProgress');

/**
 * Helper to get today's date formatted as YYYY-MM-DD
 */
const getFormattedDate = (d = new Date()) => {
  return new Date(d).toISOString().split('T')[0];
};

/**
 * @desc    Get study plan for a specific date (defaults to today)
 * @route   GET /api/study-plan/daily
 * @access  Private
 */
const getDailyPlan = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const dateStr = req.query.date || getFormattedDate();

    let plan = await StudyPlan.findOne({
      student: studentId,
      date: dateStr,
    }).populate('plannedTasks.assignment', 'title subject dueDate priority category');

    if (!plan) {
      plan = {
        student: studentId,
        date: dateStr,
        plannedTasks: [],
        notes: '',
      };
    }

    return res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get study plans for the current week (7 days)
 * @route   GET /api/study-plan/weekly
 * @access  Private
 */
const getWeeklySchedule = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const startDateStr = req.query.startDate;

    const start = startDateStr ? new Date(startDateStr) : new Date();
    // Start from Monday or beginning of week
    const dayOfWeek = start.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    start.setDate(start.getDate() - distanceToMonday);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      weekDates.push(getFormattedDate(d));
    }

    const plans = await StudyPlan.find({
      student: studentId,
      date: { $in: weekDates },
    });

    const planMap = {};
    plans.forEach((p) => {
      planMap[p.date] = p;
    });

    const weekSchedule = weekDates.map((date) => {
      const p = planMap[date];
      const totalPlanned = p ? p.plannedTasks.reduce((sum, t) => sum + (t.plannedMinutes || 0), 0) : 0;
      const totalCompleted = p ? p.plannedTasks.filter((t) => t.isCompleted).length : 0;
      const taskCount = p ? p.plannedTasks.length : 0;

      return {
        date,
        totalPlannedMinutes: totalPlanned,
        completedTasksCount: totalCompleted,
        totalTasksCount: taskCount,
        tasks: p ? p.plannedTasks : [],
        notes: p ? p.notes : '',
      };
    });

    return res.status(200).json({
      success: true,
      weekSchedule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save or update daily study plan
 * @route   POST /api/study-plan
 * @access  Private
 */
const saveDailyPlan = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { date, plannedTasks, notes } = req.body;

    const dateStr = date || getFormattedDate();

    const plan = await StudyPlan.findOneAndUpdate(
      { student: studentId, date: dateStr },
      {
        student: studentId,
        date: dateStr,
        plannedTasks: plannedTasks || [],
        notes: notes !== undefined ? notes : '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Daily study schedule saved successfully!',
      plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle completion of a task within a study plan
 * @route   PATCH /api/study-plan/:planId/task/:taskId
 * @access  Private
 */
const togglePlannedTask = async (req, res, next) => {
  try {
    const { planId, taskId } = req.params;
    const plan = await StudyPlan.findOne({
      _id: planId,
      student: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Study plan not found.' });
    }

    const task = plan.plannedTasks.id(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Planned task not found.' });
    }

    task.isCompleted = !task.isCompleted;
    if (task.isCompleted && task.completedMinutes === 0) {
      task.completedMinutes = task.plannedMinutes;
    }
    await plan.save();

    return res.status(200).json({
      success: true,
      message: `Task "${task.title}" marked as ${task.isCompleted ? 'completed' : 'pending'}!`,
      plan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyPlan,
  getWeeklySchedule,
  saveDailyPlan,
  togglePlannedTask,
};
