const User = require('../models/User');
const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');

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
    for (const pr of progressRecords) {
      progressMap.set(`${pr.student.toString()}_${pr.assignment.toString()}`, pr.status);
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
      .limit(5)
      .select('name email createdAt');

    return res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        totalTasks,
        totalWorkloads,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
        completionRate: Math.min(100, completionRate),
      },
      recentStudents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all registered student accounts with their individual assignment metrics
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: 'student' };

    if (search && search.trim() !== '') {
      const trimmed = search.trim().slice(0, 200);
      const regex = new RegExp(escapeRegex(trimmed), 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await User.countDocuments(query);

    const students = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('name email role createdAt');

    // Fetch institution-wide assignments
    const allInstitutionAssignments = await Assignment.find({ scope: 'all' });
    const institutionAssignmentIds = allInstitutionAssignments.map((a) => a._id);

    const now = new Date();

    // Compute metrics for each student
    const studentsWithMetrics = await Promise.all(
      students.map(async (student) => {
        // Individual and personal assignments for this student
        const personalOrAssigned = await Assignment.find({
          $or: [
            { scope: 'individual', assignedTo: student._id },
            { scope: 'personal', createdBy: student._id },
          ],
        });

        const totalApplicable = allInstitutionAssignments.length + personalOrAssigned.length;
        const allApplicableIds = [
          ...institutionAssignmentIds,
          ...personalOrAssigned.map((a) => a._id),
        ];

        // Fetch progress records for this student
        const studentProgress = await AssignmentProgress.find({
          student: student._id,
          assignment: { $in: allApplicableIds },
        });

        const pMap = {};
        studentProgress.forEach((p) => {
          pMap[p.assignment.toString()] = p.status;
        });

        let completed = 0;
        let pending = 0;
        let overdue = 0;

        // Check institution assignments
        allInstitutionAssignments.forEach((a) => {
          const s = pMap[a._id.toString()] || 'Pending';
          if (s === 'Completed') completed++;
          else if (s === 'In Progress' || s === 'Pending') pending++;

          if (s !== 'Completed' && new Date(a.dueDate).getTime() < now.getTime()) {
            overdue++;
          }
        });

        // Check personal/assigned assignments
        personalOrAssigned.forEach((a) => {
          const s = pMap[a._id.toString()] || 'Pending';
          if (s === 'Completed') completed++;
          else pending++;

          if (s !== 'Completed' && new Date(a.dueDate).getTime() < now.getTime()) {
            overdue++;
          }
        });

        const completionRate =
          totalApplicable > 0 ? Math.round((completed / totalApplicable) * 100) : 0;

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          createdAt: student.createdAt,
          taskMetrics: {
            total: totalApplicable,
            completed,
            pending,
            overdue,
            completionRate,
          },
        };
      })
    );

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
    const { studentId, scope, search, subject, status, priority, sort, page = 1, limit = 50 } = req.query;
    const andConditions = [];

    // Filter by student
    if (studentId && studentId !== 'All') {
      andConditions.push({
        $or: [{ assignedTo: studentId }, { createdBy: studentId }],
      });
    }

    // Filter by scope
    if (scope && scope !== 'All' && ['all', 'individual', 'personal'].includes(scope)) {
      andConditions.push({ scope });
    }

    // Filter by search keyword (title or subject)
    if (search && search.trim() !== '') {
      const trimmed = search.trim().slice(0, 200);
      const regex = new RegExp(escapeRegex(trimmed), 'i');
      andConditions.push({
        $or: [{ title: regex }, { subject: regex }],
      });
    }

    // Filter by subject
    if (subject && subject !== 'All') {
      andConditions.push({ subject: subject.trim() });
    }

    // Filter by priority
    if (priority && priority !== 'All' && ['High', 'Medium', 'Low'].includes(priority)) {
      andConditions.push({ priority });
    }

    // Filter by status using AssignmentProgress correctly
    if (status && status !== 'All' && ['Pending', 'In Progress', 'Completed'].includes(status)) {
      if (studentId && studentId !== 'All') {
        if (status === 'Pending') {
          // If status is Pending, find assignments where progress is explicitly Pending
          // OR institution-wide assignments where this student has no In Progress / Completed progress record
          const nonPendingProgress = await AssignmentProgress.find({
            student: studentId,
            status: { $in: ['In Progress', 'Completed'] },
          }).distinct('assignment');

          const explicitPending = await AssignmentProgress.find({
            student: studentId,
            status: 'Pending',
          }).distinct('assignment');

          andConditions.push({
            $or: [
              { _id: { $in: explicitPending } },
              { scope: 'all', _id: { $nin: nonPendingProgress } },
            ],
          });
        } else {
          const matchingProgress = await AssignmentProgress.find({
            student: studentId,
            status,
          }).distinct('assignment');
          andConditions.push({ _id: { $in: matchingProgress } });
        }
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
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Map each assignment and attach user / assignedStudent info
    const now = new Date();
    const tasks = assignments.map((a) => {
      const isOverdue = new Date(a.dueDate).getTime() < now.getTime();
      return {
        _id: a._id,
        title: a.title,
        subject: a.subject,
        description: a.description,
        dueDate: a.dueDate,
        priority: a.priority,
        scope: a.scope,
        createdBy: a.createdBy,
        assignedTo: a.assignedTo,
        user: a.assignedTo || a.createdBy, // Backward compatibility for UI
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
 * @desc    Admin creates an assignment (Institution-wide or for an Individual Student)
 * @route   POST /api/admin/tasks
 * @access  Private/Admin
 */
const createTaskForStudent = async (req, res, next) => {
  try {
    const { scope = 'individual', studentId, title, subject, description, dueDate, priority, status } =
      req.body;

    const targetScope = scope === 'all' ? 'all' : 'individual';

    let assignedStudent = null;

    if (targetScope === 'individual') {
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
      return res.status(400).json({
        success: false,
        message: 'Assignment title is required.',
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required.',
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Due date is required.',
      });
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid due date.',
      });
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      subject: subject.trim(),
      description: description ? description.trim() : '',
      dueDate: parsedDueDate,
      priority: priority && ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
      scope: targetScope,
      createdBy: req.user._id,
      assignedTo: targetScope === 'individual' ? assignedStudent._id : null,
    });

    // If assigned to an individual student, create initial progress record for that student
    if (targetScope === 'individual' && assignedStudent) {
      const initialStatus = ['Pending', 'In Progress', 'Completed'].includes(status)
        ? status
        : 'Pending';

      await AssignmentProgress.create({
        assignment: assignment._id,
        student: assignedStudent._id,
        status: initialStatus,
        completedAt: initialStatus === 'Completed' ? new Date() : null,
      });
    }

    const populated = await Assignment.findById(assignment._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');

    const message =
      targetScope === 'all'
        ? 'Institution-wide assignment published to all registered students!'
        : `Assignment successfully assigned to ${assignedStudent.name}!`;

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
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const { title, subject, description, dueDate, priority, scope, studentId } = req.body;

    // Validate scope if provided
    if (scope !== undefined && !['all', 'individual'].includes(scope)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment scope. Must be "all" or "individual".',
      });
    }

    const targetScope = scope !== undefined ? scope : assignment.scope;

    // Handle individual assignment scope
    if (targetScope === 'individual') {
      const targetStudentId = studentId || assignment.assignedTo;

      if (!targetStudentId) {
        return res.status(400).json({
          success: false,
          message: 'A valid student account with the student role is required for individual assignments.',
        });
      }

      const student = await User.findById(targetStudentId);
      if (!student || student.role !== 'student') {
        return res.status(400).json({
          success: false,
          message: 'A valid student account with the student role is required for individual assignments.',
        });
      }

      const previousStudentId = assignment.assignedTo ? assignment.assignedTo.toString() : null;
      const newStudentId = student._id.toString();

      // If reassigning to a different student, do NOT transfer previous student's progress
      if (previousStudentId && previousStudentId !== newStudentId) {
        // Delete previous student's progress for this assignment
        await AssignmentProgress.deleteMany({
          assignment: assignment._id,
          student: previousStudentId,
        });

        // Initialize fresh Pending status for the newly assigned student
        await AssignmentProgress.findOneAndUpdate(
          { assignment: assignment._id, student: student._id },
          { status: 'Pending', completedAt: null },
          { upsert: true, setDefaultsOnInsert: true }
        );
      } else if (!previousStudentId || assignment.scope !== 'individual') {
        // Changing from institution-wide to individual: clean up any other student records
        await AssignmentProgress.deleteMany({
          assignment: assignment._id,
          student: { $ne: student._id },
        });

        // Ensure fresh Pending progress for this designated student
        await AssignmentProgress.findOneAndUpdate(
          { assignment: assignment._id, student: student._id },
          { status: 'Pending', completedAt: null },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      assignment.scope = 'individual';
      assignment.assignedTo = student._id;
    } else if (targetScope === 'all') {
      assignment.scope = 'all';
      assignment.assignedTo = null;
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Assignment title cannot be empty.' });
      }
      assignment.title = title.trim();
    }

    if (subject !== undefined) {
      if (!subject.trim()) {
        return res.status(400).json({ success: false, message: 'Subject cannot be empty.' });
      }
      assignment.subject = subject.trim();
    }

    if (description !== undefined) {
      assignment.description = description.trim();
    }

    if (dueDate !== undefined) {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, message: 'Please provide a valid due date.' });
      }
      assignment.dueDate = parsed;
    }

    if (priority !== undefined) {
      if (!['High', 'Medium', 'Low'].includes(priority)) {
        return res.status(400).json({ success: false, message: 'Priority must be High, Medium, or Low.' });
      }
      assignment.priority = priority;
    }

    await assignment.save();

    const updated = await Assignment.findById(assignment._id)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role');

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
 * @desc    Admin deletes any assignment
 * @route   DELETE /api/admin/tasks/:id
 * @access  Private/Admin
 */
const deleteTaskByAdmin = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    // Cascade delete associated progress records
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

module.exports = {
  getAdminStats,
  getAllStudents,
  deleteStudent,
  getAllTasks,
  createTaskForStudent,
  updateTaskByAdmin,
  deleteTaskByAdmin,
};
