const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Check upcoming deadlines for a specific student and trigger smart alerts
 */
const checkStudentDeadlines = async (studentId) => {
  try {
    const student = await User.findById(studentId);
    if (!student || student.preferences?.deadlineReminders === false) {
      return;
    }

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find assignments that are due in the next 24 hours and haven't passed yet
    const upcomingAssignments = await Assignment.find({
      dueDate: { $gte: now, $lte: next24h },
      $or: [
        { scope: 'all' },
        { scope: 'individual', assignedTo: studentId },
        { scope: 'personal', createdBy: studentId },
        { isGroup: true, groupMembers: studentId },
      ],
    });

    if (upcomingAssignments.length === 0) return;

    for (const assignment of upcomingAssignments) {
      // Check if student completed this assignment
      const progress = await AssignmentProgress.findOne({
        assignment: assignment._id,
        student: studentId,
      });

      if (progress && progress.status === 'Completed') {
        continue; // Already done
      }

      const diffHours = (new Date(assignment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60);

      // Determine urgency window
      let windowTag = '24h';
      let urgencyText = 'due in less than 24 hours';
      if (diffHours <= 1) {
        windowTag = '1h';
        urgencyText = 'due in less than 1 hour! 🚨';
      } else if (diffHours <= 6) {
        windowTag = '6h';
        urgencyText = 'due in less than 6 hours! ⏰';
      }

      // Check if an alert was already triggered for this assignment in this window
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      const existingAlert = await Notification.findOne({
        recipient: studentId,
        type: 'deadline',
        message: { $regex: assignment.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
        createdAt: { $gte: sixHoursAgo },
      });

      if (!existingAlert) {
        await Notification.create({
          recipient: studentId,
          title: `Assignment Deadline Alert: ${assignment.title}`,
          message: `Your assignment "${assignment.title}" for ${assignment.subject} is ${urgencyText}. Due at ${new Date(assignment.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          type: 'deadline',
          link: '/tasks',
        });
      }
    }
  } catch (err) {
    console.warn('[DeadlineChecker Error]:', err.message);
  }
};

module.exports = { checkStudentDeadlines };
