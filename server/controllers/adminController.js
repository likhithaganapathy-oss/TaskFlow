const User = require('../models/User');
const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');
const { notifyUser } = require('./notificationController');

/**
 * Escape special regex characters so user input is treated as a literal string.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get system-wide institutional statistics for Admin Dashboard
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
const getAdminStats = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' }).select('_id');
    const totalStudents = students.length;
    const totalTasks = await Assignment.countDocuments({});
    const now = new Date();

    const studentIds = students.map((s) => s._id);

    // Fetch all assignments across all scopes
    const allAssignments = await Assignment.find({});

    // Fetch all student progress records
    const progressRecords = await AssignmentProgress.find({
      student: { $in: studentIds },
    });

    const progressMap = new Map();
    let totalSubmissions = 0;
    let totalGraded = 0;

    for (const pr of progressRecords) {
      progressMap.set(`${pr.student.toString()}_${pr.assignment.toString()}`, pr.status);
      if (pr.submission && pr.submission.submitted) totalSubmissions++;
      if (pr.grade && pr.grade.marks !== null) totalGraded++;
    }

    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;

    // Calculate metrics using assignments that actually apply to each student
    for (const student of students) {
      const studentIdStr = student._id.toString();

      for (const assignment of allAssignments) {
        let isApplicable = false;

        if (assignment.scope === 'all') {
          isApplicable = true;
        } else if (
          assignment.scope === 'individual' &&
          assignment.assignedTo &&
          assignment.assignedTo.toString() === studentIdStr
        ) {
          isApplicable = true;
        } else if (
          assignment.scope === 'personal' &&
          assignment.createdBy &&
          assignment.createdBy.toString() === studentIdStr
        ) {
          isApplicable = true;
        } else if (
          assignment.isGroup &&
          assignment.groupMembers &&
          assignment.groupMembers.some((id) => id.toString() === studentIdStr)
        ) {
          isApplicable = true;
        }

        if (isApplicable) {
          const assignIdStr = assignment._id.toString();
          const status = progressMap.get(`${studentIdStr}_${assignIdStr}`) || 'Pending';
          const isOverdue =
            status !== 'Completed' && new Date(assignment.dueDate).getTime() < now.getTime();

          if (status === 'Completed') {
            completedTasks++;
          } else if (status === 'In Progress') {
            inProgressTasks++;
          } else {
            pendingTasks++;
          }

          if (isOverdue) {
            overdueTasks++;
          }
        }
      }
    }

    const totalWorkloads = completedTasks + inProgressTasks + pendingTasks;
    const completionRate =
      totalWorkloads > 0 ? Math.round((completedTasks / totalWorkloads) * 100) : 0;

    // Recent student signups
    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('name email avatar createdAt');

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
        completionRate,
        totalSubmissions,
        totalGraded,
      },
      recentStudents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all students with individual task metrics for Admin
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = { role: 'student' };

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await User.countDocuments(query);
    const students = await User.find(query)
      .select('name email avatar role rollNumber branch year section isActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const now = new Date();
    const allAssignments = await Assignment.find({});
    const studentIds = students.map((s) => s._id);

    const allProgressRecords = await AssignmentProgress.find({
      student: { $in: studentIds },
    });

    const progressMap = new Map();
    for (const pr of allProgressRecords) {
      progressMap.set(`${pr.student.toString()}_${pr.assignment.toString()}`, pr);
    }

    const studentsWithMetrics = students.map((student) => {
      const studentIdStr = student._id.toString();
      let completed = 0;
      let pending = 0;
      let inProgress = 0;
      let overdue = 0;
      let totalApplicable = 0;
      let submissionsSubmitted = 0;

      allAssignments.forEach((assignment) => {
        let isApplicable = false;
        if (assignment.scope === 'all') isApplicable = true;
        else if (
          assignment.scope === 'individual' &&
          assignment.assignedTo &&
          assignment.assignedTo.toString() === studentIdStr
        )
          isApplicable = true;
        else if (
          assignment.scope === 'personal' &&
          assignment.createdBy &&
          assignment.createdBy.toString() === studentIdStr
        )
          isApplicable = true;

        if (isApplicable) {
          totalApplicable++;
          const pr = progressMap.get(`${studentIdStr}_${assignment._id.toString()}`);
          const status = pr ? pr.status : 'Pending';
          const isOverdue =
            status !== 'Completed' && new Date(assignment.dueDate).getTime() < now.getTime();

          if (pr && pr.submission && pr.submission.submitted) submissionsSubmitted++;

          if (status === 'Completed') completed++;
          else if (status === 'In Progress') inProgress++;
          else pending++;

          if (isOverdue) overdue++;
        }
      });

      const completionRate =
        totalApplicable > 0 ? Math.round((completed / totalApplicable) * 100) : 0;

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar || '🎓',
        role: student.role,
        rollNumber: student.rollNumber || '',
        branch: student.branch || '',
        year: student.year || null,
        section: student.section || '',
        isActive: student.isActive !== false,
        createdAt: student.createdAt,
        taskMetrics: {
          total: totalApplicable,
          completed,
          pending,
          inProgress,
          overdue,
          submissionsSubmitted,
          completionRate,
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: studentsWithMetrics.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      students: studentsWithMetrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a student account and cascade-delete all their tasks and progress
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.',
      });
    }

    if (student.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Administrator accounts cannot be deleted via student management.',
      });
    }

    // Delete student's progress records
    await AssignmentProgress.deleteMany({ student: student._id });

    // Delete student's personal assignments
    const deletedPersonal = await Assignment.deleteMany({
      scope: 'personal',
      createdBy: student._id,
    });

    // Delete student record
    await User.findByIdAndDelete(student._id);

    return res.status(200).json({
      success: true,
      message: `Student account for ${student.name} and ${deletedPersonal.deletedCount} associated personal assignments were deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all assignments across all students with filters
 * @route   GET /api/admin/tasks
 * @access  Private/Admin
 */
const getAllTasks = async (req, res, next) => {
  try {
    const { studentId, scope, search, subject, status, priority, category, sort, page = 1, limit = 50 } = req.query;
    const andConditions = [];

    // Filter by student
    if (studentId && studentId !== 'All') {
      andConditions.push({
        $or: [{ assignedTo: studentId }, { createdBy: studentId }, { groupMembers: studentId }],
      });
    }

    // Filter by scope
    if (scope && scope !== 'All' && ['all', 'individual', 'personal'].includes(scope)) {
      andConditions.push({ scope });
    }

    // Filter by category
    if (category && category !== 'All') {
      andConditions.push({ category });
    }

    // Search filter
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      andConditions.push({
        $or: [{ title: searchRegex }, { subject: searchRegex }],
      });
    }

    // Subject filter
    if (subject && subject !== 'All') {
      andConditions.push({ subject });
    }

    // Priority filter
    if (priority && priority !== 'All' && ['High', 'Medium', 'Low'].includes(priority)) {
      andConditions.push({ priority });
    }

    // Status filter
    if (status && status !== 'All') {
      const now = new Date();
      if (status === 'Overdue') {
        andConditions.push({ dueDate: { $lt: now } });
      } else {
        const matchingProgress = await AssignmentProgress.find({
          status,
        }).distinct('assignment');
        andConditions.push({ _id: { $in: matchingProgress } });
      }
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    let sortOptions = { dueDate: 1 };
    if (sort === 'dueDateDesc') sortOptions = { dueDate: -1 };
    if (sort === 'titleAsc') sortOptions = { title: 1 };
    if (sort === 'createdAtDesc') sortOptions = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Assignment.countDocuments(query);

    const assignments = await Assignment.find(query)
      .populate('createdBy', 'name email role avatar')
      .populate('assignedTo', 'name email role avatar')
      .populate('groupMembers', 'name email role avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const assignmentIds = assignments.map((a) => a._id);
    const progresses = await AssignmentProgress.find({ assignment: { $in: assignmentIds } })
      .populate('student', 'name email avatar')
      .populate('grade.gradedBy', 'name email');

    const progressByAssignment = {};
    progresses.forEach((p) => {
      const aid = p.assignment.toString();
      if (!progressByAssignment[aid]) progressByAssignment[aid] = [];
      progressByAssignment[aid].push(p);
    });

    // Map each assignment and attach user / submission info
    const now = new Date();
    const tasks = assignments.map((a) => {
      const isOverdue = new Date(a.dueDate).getTime() < now.getTime();
      const progs = progressByAssignment[a._id.toString()] || [];
      const submissions = progs.filter((p) => p.submission && p.submission.submitted);
      const graded = progs.filter((p) => p.grade && p.grade.marks !== null);

      return {
        _id: a._id,
        title: a.title,
        subject: a.subject,
        category: a.category || 'Homework',
        description: a.description,
        dueDate: a.dueDate,
        priority: a.priority,
        scope: a.scope,
        maxMarks: a.maxMarks || 100,
        isGroup: a.isGroup || false,
        groupMembers: a.groupMembers || [],
        createdBy: a.createdBy,
        assignedTo: a.assignedTo,
        user: a.assignedTo || a.createdBy,
        submissionsCount: submissions.length,
        gradedCount: graded.length,
        progressCount: progs.length,
        isOverdue,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin creates an assignment (Institution-wide, Individual Student, or Group Assignment)
 * @route   POST /api/admin/tasks
 * @access  Private/Admin
 */
const createTaskForStudent = async (req, res, next) => {
  try {
    const {
      scope = 'individual',
      studentId,
      title,
      subject,
      category = 'Homework',
      description,
      dueDate,
      priority,
      status,
      maxMarks = 100,
      isGroup = false,
      groupMembers = [],
    } = req.body;

    const targetScope = scope === 'all' ? 'all' : 'individual';
    let assignedStudent = null;

    if (targetScope === 'individual' && !isGroup) {
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'A target student is required for individual assignments.',
        });
      }

      assignedStudent = await User.findById(studentId);
      if (!assignedStudent || assignedStudent.role !== 'student') {
        return res.status(404).json({
          success: false,
          message: 'Designated student account not found.',
        });
      }
    }

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
      scope: targetScope,
      maxMarks: Number(maxMarks) || 100,
      isGroup: Boolean(isGroup),
      groupMembers: Array.isArray(groupMembers) ? groupMembers : [],
      createdBy: req.user._id,
      assignedTo: targetScope === 'individual' && assignedStudent ? assignedStudent._id : null,
    });

    const initialStatus = ['Pending', 'In Progress', 'Completed'].includes(status) ? status : 'Pending';

    // If assigned to an individual student, create progress record and notify
    if (targetScope === 'individual' && assignedStudent) {
      await AssignmentProgress.create({
        assignment: assignment._id,
        student: assignedStudent._id,
        status: initialStatus,
        completedAt: initialStatus === 'Completed' ? new Date() : null,
      });

      await notifyUser({
        recipient: assignedStudent._id,
        sender: req.user._id,
        title: 'New Assignment Assigned! 📚',
        message: `Faculty assigned you: "${assignment.title}". Due on ${parsedDueDate.toLocaleDateString()}.`,
        type: 'assignment',
        link: '/tasks',
      });
    }

    // If assigned to group members
    if (isGroup && Array.isArray(groupMembers) && groupMembers.length > 0) {
      for (const memberId of groupMembers) {
        await AssignmentProgress.findOneAndUpdate(
          { assignment: assignment._id, student: memberId },
          { status: initialStatus },
          { upsert: true, setDefaultsOnInsert: true }
        );

        await notifyUser({
          recipient: memberId,
          sender: req.user._id,
          title: 'New Group Assignment! 👥',
          message: `You were added to a team for "${assignment.title}". Due on ${parsedDueDate.toLocaleDateString()}.`,
          type: 'assignment',
          link: '/tasks',
        });
      }
    }

    // If scope is 'all', notify all students
    if (targetScope === 'all') {
      const allStudents = await User.find({ role: 'student' }).select('_id');
      for (const s of allStudents) {
        await notifyUser({
          recipient: s._id,
          sender: req.user._id,
          title: 'Campus Coursework Published 📢',
          message: `New coursework "${assignment.title}" in ${assignment.subject} has been assigned to all students.`,
          type: 'assignment',
          link: '/tasks',
        });
      }
    }

    const populated = await Assignment.findById(assignment._id)
      .populate('createdBy', 'name email role avatar')
      .populate('assignedTo', 'name email role avatar')
      .populate('groupMembers', 'name email role avatar');

    const message =
      targetScope === 'all'
        ? 'Institution-wide assignment published to all registered students!'
        : isGroup
        ? `Group assignment created for ${groupMembers.length} team members!`
        : `Assignment successfully assigned to ${assignedStudent?.name}!`;

    return res.status(201).json({
      success: true,
      message,
      task: {
        ...populated.toJSON(),
        user: populated.assignedTo || populated.createdBy,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin updates any assignment definition
 * @route   PUT /api/admin/tasks/:id
 * @access  Private/Admin
 */
const updateTaskByAdmin = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const { title, subject, category, description, dueDate, priority, scope, studentId, maxMarks, isGroup, groupMembers } = req.body;

    if (scope !== undefined && !['all', 'individual'].includes(scope)) {
      return res.status(400).json({ success: false, message: 'Invalid assignment scope. Must be "all" or "individual".' });
    }

    const targetScope = scope !== undefined ? scope : assignment.scope;

    if (targetScope === 'individual') {
      const targetStudentId = studentId || assignment.assignedTo;
      if (targetStudentId) {
        assignment.scope = 'individual';
        assignment.assignedTo = targetStudentId;
      }
    } else if (targetScope === 'all') {
      assignment.scope = 'all';
      assignment.assignedTo = null;
    }

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
    if (maxMarks) assignment.maxMarks = Number(maxMarks) || 100;
    if (isGroup !== undefined) assignment.isGroup = Boolean(isGroup);
    if (Array.isArray(groupMembers)) assignment.groupMembers = groupMembers;

    await assignment.save();

    const updated = await Assignment.findById(assignment._id)
      .populate('createdBy', 'name email role avatar')
      .populate('assignedTo', 'name email role avatar')
      .populate('groupMembers', 'name email role avatar');

    return res.status(200).json({
      success: true,
      message: 'Assignment updated successfully.',
      task: {
        ...updated.toJSON(),
        user: updated.assignedTo || updated.createdBy,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Faculty / Admin evaluates and grades a student submission
 * @route   POST /api/admin/tasks/:id/grade
 * @access  Private/Admin
 */
const gradeSubmission = async (req, res, next) => {
  try {
    const { studentId, marks, maxMarks, feedback } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Target student ID is required' });
    }

    const numericMarks = Number(marks);
    if (isNaN(numericMarks) || numericMarks < 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid non-negative marks' });
    }

    const progress = await AssignmentProgress.findOneAndUpdate(
      { assignment: assignment._id, student: studentId },
      {
        grade: {
          marks: numericMarks,
          maxMarks: Number(maxMarks) || assignment.maxMarks || 100,
          feedback: feedback ? feedback.trim() : '',
          gradedBy: req.user._id,
          gradedAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Notify the student
    await notifyUser({
      recipient: studentId,
      sender: req.user._id,
      title: 'Coursework Graded! 🎓',
      message: `Your work for "${assignment.title}" received ${numericMarks}/${progress.grade.maxMarks} marks. ${feedback ? 'Feedback: ' + feedback : ''}`,
      type: 'feedback',
      link: '/tasks',
    });

    return res.status(200).json({
      success: true,
      message: 'Evaluation and feedback recorded successfully!',
      grade: progress.grade,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all student submissions and progress for an assignment
 * @route   GET /api/admin/tasks/:id/submissions
 * @access  Private/Admin
 */
const getSubmissions = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const progresses = await AssignmentProgress.find({ assignment: assignment._id })
      .populate('student', 'name email avatar role')
      .populate('grade.gradedBy', 'name email');

    return res.status(200).json({
      success: true,
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        dueDate: assignment.dueDate,
        maxMarks: assignment.maxMarks,
        isGroup: assignment.isGroup,
      },
      submissions: progresses.map((p) => ({
        _id: p._id,
        student: p.student,
        status: p.status,
        completedAt: p.completedAt,
        submission: p.submission,
        grade: p.grade,
        timeSpentMinutes: p.timeSpentMinutes,
        pomodoroSessions: p.pomodoroSessions,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin deletes any assignment
 * @route   DELETE /api/admin/tasks/:id
 * @access  Private/Admin
 */
const deleteTaskByAdmin = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    await AssignmentProgress.deleteMany({ assignment: assignment._id });
    await Assignment.findByIdAndDelete(assignment._id);

    return res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully by administrator.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new student account (Admin created)
 * @route   POST /api/admin/users
 * @access  Private/Admin
 */
const createStudent = async (req, res, next) => {
  try {
    const { name, email, password, rollNumber, branch, year, section } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const student = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'student',
      avatar: '🎓',
      rollNumber: rollNumber ? rollNumber.trim() : '',
      branch: branch ? branch.trim() : '',
      year: year || null,
      section: section ? section.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: `Student account for ${student.name} created successfully!`,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        rollNumber: student.rollNumber,
        branch: student.branch,
        year: student.year,
        section: student.section,
        isActive: student.isActive,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a student account details
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
const updateStudent = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be edited via student management.',
      });
    }

    const { name, email, rollNumber, branch, year, section, password } = req.body;

    if (name && name.trim()) student.name = name.trim();
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const emailExists = await User.findOne({ email: normalizedEmail, _id: { $ne: student._id } });
      if (emailExists) {
        return res.status(409).json({ success: false, message: 'Email already in use.' });
      }
      student.email = normalizedEmail;
    }
    if (rollNumber !== undefined) student.rollNumber = rollNumber.trim();
    if (branch !== undefined) student.branch = branch.trim();
    if (year !== undefined) student.year = year;
    if (section !== undefined) student.section = section.trim();
    if (password && password.length >= 6) student.password = password;

    await student.save();

    return res.status(200).json({
      success: true,
      message: `Student ${student.name} updated successfully!`,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        rollNumber: student.rollNumber,
        branch: student.branch,
        year: student.year,
        section: student.section,
        isActive: student.isActive,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Activate or deactivate a student account
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private/Admin
 */
const toggleStudentStatus = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be deactivated via student management.',
      });
    }

    student.isActive = !student.isActive;
    await student.save();

    return res.status(200).json({
      success: true,
      message: `Student ${student.name} has been ${student.isActive ? 'activated' : 'deactivated'}.`,
      student: {
        _id: student._id,
        name: student.name,
        isActive: student.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send announcement notification to all or selected students
 * @route   POST /api/admin/announcements
 * @access  Private/Admin
 */
const sendAnnouncement = async (req, res, next) => {
  try {
    const { title, message, recipients } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required.',
      });
    }

    let targetStudents;
    if (!recipients || recipients === 'all') {
      targetStudents = await User.find({ role: 'student', isActive: true }).select('_id');
    } else if (Array.isArray(recipients)) {
      targetStudents = recipients.map((id) => ({ _id: id }));
    } else {
      return res.status(400).json({ success: false, message: 'Invalid recipients format.' });
    }

    const Notification = require('../models/Notification');
    const notifications = targetStudents.map((s) => ({
      recipient: s._id,
      sender: req.user._id,
      title: title.trim(),
      message: message.trim(),
      type: 'announcement',
      link: '/dashboard',
    }));

    await Notification.insertMany(notifications);

    return res.status(201).json({
      success: true,
      message: `Announcement sent to ${targetStudents.length} student(s)!`,
      count: targetStudents.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getAllStudents,
  deleteStudent,
  getAllTasks,
  createTaskForStudent,
  updateTaskByAdmin,
  gradeSubmission,
  getSubmissions,
  deleteTaskByAdmin,
  createStudent,
  updateStudent,
  toggleStudentStatus,
  sendAnnouncement,
};
