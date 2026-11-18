const User = require('../models/User');
const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');
const CalendarEvent = require('../models/CalendarEvent');

/**
 * @desc    Submission Monitoring Overview across all students
 * @route   GET /api/admin/submissions/overview
 * @access  Private/Admin
 */
const getSubmissionMonitoring = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' }).select('name email rollNumber branch year section isActive');
    const allAssignments = await Assignment.find({});
    const now = new Date();

    const progressRecords = await AssignmentProgress.find({}).populate('assignment', 'title subject dueDate maxMarks');

    const progressByStudent = {};
    progressRecords.forEach((p) => {
      const sId = p.student.toString();
      if (!progressByStudent[sId]) progressByStudent[sId] = [];
      progressByStudent[sId].push(p);
    });

    const studentOverview = students.map((student) => {
      const records = progressByStudent[student._id.toString()] || [];
      const applicableAssignments = allAssignments.filter((a) => {
        if (a.scope === 'all') return true;
        if (a.scope === 'individual' && a.assignedTo?.toString() === student._id.toString()) return true;
        if (a.isGroup && a.groupMembers?.some((m) => m.toString() === student._id.toString())) return true;
        return false;
      });

      let submittedCount = 0;
      let lateCount = 0;
      let pendingCount = 0;
      let gradedCount = 0;
      let totalMarksEarned = 0;
      let totalMarksPossible = 0;

      applicableAssignments.forEach((assignment) => {
        const p = records.find((r) => r.assignment?._id?.toString() === assignment._id.toString());
        const isPastDue = new Date(assignment.dueDate).getTime() < now.getTime();

        if (p?.submission?.submitted) {
          submittedCount++;
          if (p.submission.submittedAt && new Date(p.submission.submittedAt) > new Date(assignment.dueDate)) {
            lateCount++;
          }
          if (p.grade?.marks !== null && p.grade?.marks !== undefined) {
            gradedCount++;
            totalMarksEarned += p.grade.marks;
            totalMarksPossible += p.grade.maxMarks || 100;
          }
        } else {
          pendingCount++;
          if (isPastDue) {
            lateCount++;
          }
        }
      });

      const avgGradePercent = totalMarksPossible > 0 ? Math.round((totalMarksEarned / totalMarksPossible) * 100) : null;

      return {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber || '',
          branch: student.branch || '',
          year: student.year || null,
          section: student.section || '',
          isActive: student.isActive !== false,
        },
        metrics: {
          totalAssigned: applicableAssignments.length,
          submitted: submittedCount,
          pending: pendingCount,
          late: lateCount,
          graded: gradedCount,
          averageGradePercent: avgGradePercent,
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: studentOverview.length,
      overview: studentOverview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Institutional Calendar Events + Deadlines
 * @route   GET /api/admin/calendar/events
 * @access  Private
 */
const getCalendarEvents = async (req, res, next) => {
  try {
    const customEvents = await CalendarEvent.find({}).sort({ startDate: 1 });
    const assignments = await Assignment.find({}).select('title subject dueDate priority category scope isGroup');

    // Format assignments into unified calendar event structure
    const assignmentEvents = assignments.map((a) => ({
      _id: a._id,
      title: `${a.subject}: ${a.title}`,
      eventType: 'Deadline',
      startDate: a.dueDate,
      endDate: a.dueDate,
      priority: a.priority,
      category: a.category,
      isAssignment: true,
    }));

    return res.status(200).json({
      success: true,
      events: [...customEvents, ...assignmentEvents],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create institutional calendar event
 * @route   POST /api/admin/calendar/events
 * @access  Private/Admin
 */
const createCalendarEvent = async (req, res, next) => {
  try {
    const { title, eventType, startDate, endDate, description, department } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ success: false, message: 'Title and start date are required.' });
    }

    const event = await CalendarEvent.create({
      title: title.trim(),
      eventType: eventType || 'Institutional',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      description: description ? description.trim() : '',
      department: department || 'All',
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: `Event "${event.title}" added to institutional calendar!`,
      event,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete institutional calendar event
 * @route   DELETE /api/admin/calendar/events/:id
 * @access  Private/Admin
 */
const deleteCalendarEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    await CalendarEvent.findByIdAndDelete(event._id);

    return res.status(200).json({
      success: true,
      message: 'Calendar event removed.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Exportable Reports Dataset (Students, Assignments, Submissions)
 * @route   GET /api/admin/reports/:type
 * @access  Private/Admin
 */
const getReportData = async (req, res, next) => {
  try {
    const { type } = req.params;

    if (type === 'students') {
      const students = await User.find({ role: 'student' })
        .select('name email rollNumber branch year section isActive createdAt')
        .sort({ name: 1 });

      const data = students.map((s, idx) => ({
        'S.No': idx + 1,
        'Full Name': s.name,
        'Email Address': s.email,
        'Roll Number': s.rollNumber || 'N/A',
        'Branch': s.branch || 'N/A',
        'Academic Year': s.year ? `Year ${s.year}` : 'N/A',
        'Section': s.section || 'N/A',
        'Account Status': s.isActive !== false ? 'Active' : 'Deactivated',
        'Enrolled Date': new Date(s.createdAt).toLocaleDateString(),
      }));

      return res.status(200).json({ success: true, reportType: 'students', data });
    }

    if (type === 'assignments') {
      const assignments = await Assignment.find({})
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1 });

      const data = assignments.map((a, idx) => ({
        'S.No': idx + 1,
        'Assignment Title': a.title,
        'Subject': a.subject,
        'Category': a.category,
        'Due Date': new Date(a.dueDate).toLocaleDateString(),
        'Priority': a.priority,
        'Scope': a.scope,
        'Max Marks': a.maxMarks,
        'Is Group': a.isGroup ? 'Yes' : 'No',
        'Created By': a.createdBy?.name || 'Administrator',
      }));

      return res.status(200).json({ success: true, reportType: 'assignments', data });
    }

    if (type === 'submissions') {
      const records = await AssignmentProgress.find({ 'submission.submitted': true })
        .populate('student', 'name email rollNumber branch section')
        .populate('assignment', 'title subject dueDate maxMarks')
        .sort({ 'submission.submittedAt': -1 });

      const data = records.map((r, idx) => {
        const isLate = r.assignment?.dueDate && r.submission?.submittedAt && new Date(r.submission.submittedAt) > new Date(r.assignment.dueDate);
        return {
          'S.No': idx + 1,
          'Student Name': r.student?.name || 'Unknown',
          'Roll Number': r.student?.rollNumber || 'N/A',
          'Assignment': r.assignment?.title || 'Unknown',
          'Subject': r.assignment?.subject || 'N/A',
          'Submitted Date': r.submission?.submittedAt ? new Date(r.submission.submittedAt).toLocaleString() : 'N/A',
          'Turn-In Status': isLate ? 'Late Submission ⚠️' : 'On-Time ✅',
          'Marks Obtained': r.grade?.marks !== null ? `${r.grade?.marks} / ${r.grade?.maxMarks || 100}` : 'Ungraded',
          'Feedback': r.grade?.feedback || 'Pending evaluation',
        };
      });

      return res.status(200).json({ success: true, reportType: 'submissions', data });
    }

    return res.status(400).json({ success: false, message: 'Invalid report type requested.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubmissionMonitoring,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getReportData,
};
