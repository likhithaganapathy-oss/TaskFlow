const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');
const { notifyUser } = require('./notificationController');
const User = require('../models/User');

/**
 * Escape special regex characters so user input is treated as a literal string.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all assignments for the authenticated student with filtering, searching, and sorting
 * @route   GET /api/tasks
 * @access  Private (Student & Admin)
 */
const getTasks = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { search, subject, status, priority, scope, category, sort } = req.query;

    // Base visibility filter: institution-wide, individually assigned, or personal, or group member
    const baseFilter = {
      $or: [
        { scope: 'all' },
        { scope: 'individual', assignedTo: studentId },
        { scope: 'personal', createdBy: studentId },
        { isGroup: true, groupMembers: studentId },
      ],
    };

    const query = { ...baseFilter };

    // Search filter (matches title or subject) — escaped and length-capped
    if (search && search.trim() !== '') {
      const trimmed = search.trim().slice(0, 200);
      const searchRegex = new RegExp(escapeRegex(trimmed), 'i');
      query.$and = [{ $or: [{ title: searchRegex }, { subject: searchRegex }] }];
    }

    // Subject filter
    if (subject && subject.trim() !== '' && subject !== 'All') {
      query.subject = subject.trim();
    }

    // Priority filter
    if (priority && priority !== 'All' && ['High', 'Medium', 'Low'].includes(priority)) {
      query.priority = priority;
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Scope filter (if user wants only personal, or only institution-wide)
    if (scope && scope !== 'All' && ['all', 'individual', 'personal'].includes(scope)) {
      query.scope = scope;
    }

    // Fetch matching assignments
    const assignments = await Assignment.find(query)
      .populate('createdBy', 'name email role avatar')
      .populate('groupMembers', 'name email role avatar');

    // Fetch this student's progress records for the matching assignments
    const assignmentIds = assignments.map((a) => a._id);
    const progressRecords = await AssignmentProgress.find({
      student: studentId,
      assignment: { $in: assignmentIds },
    });

    const progressMap = {};
    progressRecords.forEach((p) => {
      progressMap[p.assignment.toString()] = p;
    });

    const now = new Date();

    // Merge assignment definition with this student's specific progress
    let tasks = assignments.map((assignment) => {
      const p = progressMap[assignment._id.toString()];
      const studentStatus = p ? p.status : 'Pending';
      const completedAt = p ? p.completedAt : null;
      const isOverdue =
        studentStatus !== 'Completed' && new Date(assignment.dueDate).getTime() < now.getTime();

      return {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        category: assignment.category || 'Homework',
        description: assignment.description,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
        maxMarks: assignment.maxMarks || 100,
        isGroup: assignment.isGroup || false,
        groupMembers: assignment.groupMembers || [],
        createdBy: assignment.createdBy,
        assignedTo: assignment.assignedTo,
        status: studentStatus,
        completedAt,
        isOverdue,
        submission: p?.submission || { submitted: false },
        grade: p?.grade || null,
        timeSpentMinutes: p?.timeSpentMinutes || 0,
        pomodoroSessions: p?.pomodoroSessions || 0,
        isOwner: assignment.scope === 'personal' && assignment.createdBy._id.equals(studentId),
        createdAt: assignment.createdAt,
        updatedAt: p ? p.updatedAt : assignment.updatedAt,
      };
    });

    // In-memory status filter
    if (status && status !== 'All') {
      if (status === 'Overdue') {
        tasks = tasks.filter((t) => t.isOverdue);
      } else {
        tasks = tasks.filter((t) => t.status === status);
      }
    }

    // Sorting
    switch (sort) {
      case 'dueDateAsc':
        tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        break;
      case 'dueDateDesc':
        tasks.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        break;
      case 'priority': {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        tasks.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        break;
      }
      case 'titleAsc':
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'newest':
      default:
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    // Calculate live counts
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const pending = tasks.filter((t) => t.status === 'Pending').length;
    const overdue = tasks.filter((t) => t.isOverdue).length;
    const upcoming = tasks.filter(
      (t) => !t.isOverdue && t.status !== 'Completed' && new Date(t.dueDate) > now
    ).length;

    return res.status(200).json({
      success: true,
      count: tasks.length,
      stats: {
        total,
        pending,
        inProgress,
        completed,
        overdue,
        upcoming,
      },
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single assignment by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const assignment = await Assignment.findById(req.params.id)
      .populate('createdBy', 'name email role avatar')
      .populate('groupMembers', 'name email role avatar');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const isAuthorized =
      assignment.scope === 'all' ||
      (assignment.scope === 'individual' && assignment.assignedTo && assignment.assignedTo.equals(studentId)) ||
      (assignment.scope === 'personal' && assignment.createdBy.equals(studentId)) ||
      (assignment.isGroup && assignment.groupMembers.some((m) => m._id.equals(studentId))) ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to view this assignment.',
      });
    }

    const progress = await AssignmentProgress.findOne({
      assignment: assignment._id,
      student: studentId,
    });

    const now = new Date();
    const studentStatus = progress ? progress.status : 'Pending';
    const isOverdue =
      studentStatus !== 'Completed' && new Date(assignment.dueDate).getTime() < now.getTime();

    return res.status(200).json({
      success: true,
      task: {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        category: assignment.category || 'Homework',
        description: assignment.description,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
        maxMarks: assignment.maxMarks || 100,
        isGroup: assignment.isGroup || false,
        groupMembers: assignment.groupMembers || [],
        createdBy: assignment.createdBy,
        assignedTo: assignment.assignedTo,
        status: studentStatus,
        completedAt: progress ? progress.completedAt : null,
        submission: progress?.submission || { submitted: false },
        grade: progress?.grade || null,
        timeSpentMinutes: progress?.timeSpentMinutes || 0,
        pomodoroSessions: progress?.pomodoroSessions || 0,
        isOverdue,
        isOwner: assignment.scope === 'personal' && assignment.createdBy._id.equals(studentId),
        createdAt: assignment.createdAt,
        updatedAt: progress ? progress.updatedAt : assignment.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a personal assignment (Student created)
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res, next) => {
  try {
    const { title, subject, category = 'Homework', description, dueDate, priority, status = 'Pending' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Assignment title is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'Due date is required.' });
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid due date.' });
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      subject: subject.trim(),
      category: ['Homework', 'Lab Report', 'Project', 'Essay', 'Presentation', 'Exam Prep', 'Other'].includes(category)
        ? category
        : 'Homework',
      description: description ? description.trim() : '',
      dueDate: parsedDueDate,
      priority: priority && ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
      scope: 'personal',
      createdBy: req.user._id,
      assignedTo: req.user._id,
    });

    const initialStatus = ['Pending', 'In Progress', 'Completed'].includes(status) ? status : 'Pending';
    const progress = await AssignmentProgress.create({
      assignment: assignment._id,
      student: req.user._id,
      status: initialStatus,
      completedAt: initialStatus === 'Completed' ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Personal assignment created successfully!',
      task: {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        category: assignment.category,
        description: assignment.description,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
        status: progress.status,
        completedAt: progress.completedAt,
        isOwner: true,
        createdAt: assignment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a personal assignment
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.scope !== 'personal' || !assignment.createdBy.equals(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You can only edit personal assignments you created.',
      });
    }

    const { title, subject, category, description, dueDate, priority, status } = req.body;

    if (title && title.trim()) assignment.title = title.trim();
    if (subject && subject.trim()) assignment.subject = subject.trim();
    if (category) assignment.category = category;
    if (description !== undefined) assignment.description = description.trim();
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) assignment.dueDate = parsed;
    }
    if (priority && ['High', 'Medium', 'Low'].includes(priority)) {
      assignment.priority = priority;
    }

    await assignment.save();

    let progress = await AssignmentProgress.findOne({
      assignment: assignment._id,
      student: studentId,
    });

    if (status && ['Pending', 'In Progress', 'Completed'].includes(status)) {
      if (!progress) {
        progress = await AssignmentProgress.create({
          assignment: assignment._id,
          student: studentId,
          status,
          completedAt: status === 'Completed' ? new Date() : null,
        });
      } else {
        progress.status = status;
        progress.completedAt = status === 'Completed' ? new Date() : null;
        await progress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Assignment updated successfully!',
      task: {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        category: assignment.category,
        description: assignment.description,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
        status: progress ? progress.status : 'Pending',
        completedAt: progress ? progress.completedAt : null,
        isOwner: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update progress status (Pending -> In Progress -> Completed)
 * @route   PATCH /api/tasks/:id/status
 * @access  Private
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { status } = req.body;

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status must be Pending, In Progress, or Completed.',
      });
    }

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const progress = await AssignmentProgress.findOneAndUpdate(
      { assignment: assignment._id, student: studentId },
      {
        status,
        completedAt: status === 'Completed' ? new Date() : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}!`,
      task: {
        _id: assignment._id,
        status: progress.status,
        completedAt: progress.completedAt,
        updatedAt: progress.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit an assignment file (PDF, DOCX, PPTX, or text)
 * @route   POST /api/tasks/:id/submit
 * @access  Private (Student)
 */
const submitTask = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { fileData, fileName, fileType, fileSize, notes } = req.body;

    if (!fileData && (!notes || !notes.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a completed file or provide submission notes.',
      });
    }

    const assignment = await Assignment.findById(req.params.id).populate('createdBy', 'name email role');
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const progress = await AssignmentProgress.findOneAndUpdate(
      { assignment: assignment._id, student: studentId },
      {
        status: 'Completed',
        completedAt: new Date(),
        submission: {
          submitted: true,
          fileData: fileData || null,
          fileName: fileName || 'Submission Document',
          fileType: fileType || 'application/octet-stream',
          fileSize: fileSize || 0,
          notes: notes ? notes.trim() : '',
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Notify student confirmation
    await notifyUser({
      recipient: studentId,
      title: 'Submission Received! ✅',
      message: `Your work for "${assignment.title}" has been successfully submitted.`,
      type: 'submission',
      link: '/tasks',
    });

    // Notify assignment creator if created by admin
    if (assignment.createdBy && assignment.createdBy.role === 'admin') {
      await notifyUser({
        recipient: assignment.createdBy._id,
        sender: studentId,
        title: 'New Student Submission 📥',
        message: `${req.user.name} submitted coursework for "${assignment.title}".`,
        type: 'submission',
        link: '/admin/tasks',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully! Marked as Completed.',
      submission: progress.submission,
      status: progress.status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log Pomodoro study time spent on an assignment
 * @route   POST /api/tasks/:id/study-time
 * @access  Private
 */
const logStudyTime = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { minutes = 25, isPomodoro = true } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const progress = await AssignmentProgress.findOneAndUpdate(
      { assignment: assignment._id, student: studentId },
      {
        $inc: {
          timeSpentMinutes: Number(minutes) || 0,
          pomodoroSessions: isPomodoro ? 1 : 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: `Logged ${minutes} minutes of focused study!`,
      timeSpentMinutes: progress.timeSpentMinutes,
      pomodoroSessions: progress.pomodoroSessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed student productivity analytics (Weekly velocity, trends, subjects)
 * @route   GET /api/tasks/analytics
 * @access  Private
 */
const getStudentAnalytics = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    // Fetch student's accessible assignments
    const assignments = await Assignment.find({
      $or: [
        { scope: 'all' },
        { scope: 'individual', assignedTo: studentId },
        { scope: 'personal', createdBy: studentId },
        { isGroup: true, groupMembers: studentId },
      ],
    });

    const assignmentIds = assignments.map((a) => a._id);
    const progresses = await AssignmentProgress.find({
      student: studentId,
      assignment: { $in: assignmentIds },
    });

    const progressMap = {};
    let totalTimeMinutes = 0;
    let totalPomodoroCount = 0;
    let totalGradedCount = 0;
    let totalMarksEarned = 0;
    let totalMarksPossible = 0;

    progresses.forEach((p) => {
      progressMap[p.assignment.toString()] = p;
      totalTimeMinutes += p.timeSpentMinutes || 0;
      totalPomodoroCount += p.pomodoroSessions || 0;

      if (p.grade && typeof p.grade.marks === 'number') {
        totalGradedCount++;
        totalMarksEarned += p.grade.marks;
        totalMarksPossible += p.grade.maxMarks || 100;
      }
    });

    const now = new Date();
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const subjectMap = {};
    const categoryMap = {};

    assignments.forEach((a) => {
      const p = progressMap[a._id.toString()];
      const status = p ? p.status : 'Pending';
      const isOverdue = status !== 'Completed' && new Date(a.dueDate).getTime() < now.getTime();

      if (status === 'Completed') completedCount++;
      else if (status === 'In Progress') inProgressCount++;
      else pendingCount++;

      if (isOverdue) overdueCount++;

      // Subject stats
      if (!subjectMap[a.subject]) {
        subjectMap[a.subject] = { total: 0, completed: 0 };
      }
      subjectMap[a.subject].total++;
      if (status === 'Completed') subjectMap[a.subject].completed++;

      // Category stats
      const cat = a.category || 'Homework';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat]++;
    });

    const totalAssignments = assignments.length;
    const completionRate =
      totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0;

    // Build last 7 days productivity curve
    const weeklyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      const completedOnDay = progresses.filter((p) => {
        if (!p.completedAt) return false;
        const cDate = new Date(p.completedAt);
        return cDate >= dayStart && cDate <= dayEnd;
      }).length;

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weeklyTrends.push({
        day: dayNames[dayStart.getDay()],
        date: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
        completed: completedOnDay,
      });
    }

    const averageGrade =
      totalMarksPossible > 0 ? Math.round((totalMarksEarned / totalMarksPossible) * 100) : null;

    return res.status(200).json({
      success: true,
      analytics: {
        totalAssignments,
        completedCount,
        inProgressCount,
        pendingCount,
        overdueCount,
        completionRate,
        totalTimeMinutes,
        totalPomodoroCount,
        averageGrade,
        gradedAssignmentsCount: totalGradedCount,
        subjectBreakdown: Object.keys(subjectMap).map((sub) => ({
          subject: sub,
          total: subjectMap[sub].total,
          completed: subjectMap[sub].completed,
        })),
        categoryBreakdown: Object.keys(categoryMap).map((cat) => ({
          category: cat,
          count: categoryMap[cat],
        })),
        weeklyTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a personal assignment
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const isOwner = assignment.scope === 'personal' && assignment.createdBy.equals(studentId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Only your own personal assignments can be deleted.',
      });
    }

    await AssignmentProgress.deleteMany({ assignment: assignment._id });
    await Assignment.findByIdAndDelete(assignment._id);

    return res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  submitTask,
  logStudyTime,
  getStudentAnalytics,
  deleteTask,
};
