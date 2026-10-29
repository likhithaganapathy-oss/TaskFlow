const Assignment = require('../models/Assignment');
const AssignmentProgress = require('../models/AssignmentProgress');

/**
 * Escape special regex characters so user input is treated as a literal string.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all assignments for the authenticated student with filtering, searching, and sorting
 *          Returns:
 *          - Institution-wide assignments (scope: 'all')
 *          - Individual assignments assigned to this student (scope: 'individual', assignedTo: studentId)
 *          - Personal assignments created by this student (scope: 'personal', createdBy: studentId)
 *          Each assignment is merged with the student's personal progress status.
 * @route   GET /api/tasks
 * @access  Private (Student & Admin)
 */
const getTasks = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { search, subject, status, priority, scope, sort } = req.query;

    // Base visibility filter: institution-wide, individually assigned, or personal
    const baseFilter = {
      $or: [
        { scope: 'all' },
        { scope: 'individual', assignedTo: studentId },
        { scope: 'personal', createdBy: studentId },
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

    // Scope filter (if user wants only personal, or only institution-wide)
    if (scope && scope !== 'All' && ['all', 'individual', 'personal'].includes(scope)) {
      query.scope = scope;
    }

    // Fetch matching assignments
    const assignments = await Assignment.find(query).populate('createdBy', 'name email role');

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
        description: assignment.description,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
        createdBy: assignment.createdBy,
        assignedTo: assignment.assignedTo,
        status: studentStatus,
        completedAt,
        isOverdue,
        isOwner: assignment.scope === 'personal' && assignment.createdBy._id.equals(studentId),
        createdAt: assignment.createdAt,
        updatedAt: p ? p.updatedAt : assignment.updatedAt,
      };
    });

    // Filter by student status (since status is in progress record)
    if (status && status !== 'All') {
      if (status === 'Overdue') {
        tasks = tasks.filter((t) => t.isOverdue);
      } else if (['Pending', 'In Progress', 'Completed'].includes(status)) {
        tasks = tasks.filter((t) => t.status === status);
      }
    }

    // Sorting
    tasks.sort((a, b) => {
      if (sort === 'dueDateDesc') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      } else if (sort === 'titleAsc') {
        return a.title.localeCompare(b.title);
      } else if (sort === 'titleDesc') {
        return b.title.localeCompare(a.title);
      } else if (sort === 'createdAtDesc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sort === 'priority') {
        const priorityWeight = { High: 3, Medium: 2, Low: 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      } else {
        // Default: earliest due date first
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
    });

    // ------------------------------------------------------------------
    // Live Statistics: calculated across ALL assignments applicable to this student
    // ------------------------------------------------------------------
    const allApplicableAssignments = await Assignment.find(baseFilter);
    const allProgress = await AssignmentProgress.find({
      student: studentId,
      assignment: { $in: allApplicableAssignments.map((a) => a._id) },
    });

    const allProgressMap = {};
    allProgress.forEach((p) => {
      allProgressMap[p.assignment.toString()] = p.status;
    });

    let pendingCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;

    allApplicableAssignments.forEach((a) => {
      const s = allProgressMap[a._id.toString()] || 'Pending';
      if (s === 'Pending') pendingCount++;
      if (s === 'In Progress') inProgressCount++;
      if (s === 'Completed') completedCount++;

      const isTaskOverdue = s !== 'Completed' && new Date(a.dueDate).getTime() < now.getTime();
      if (isTaskOverdue) {
        overdueCount++;
      } else if (s !== 'Completed') {
        upcomingCount++;
      }
    });

    const stats = {
      total: allApplicableAssignments.length,
      pending: pendingCount,
      inProgress: inProgressCount,
      completed: completedCount,
      overdue: overdueCount,
      upcoming: upcomingCount,
    };

    return res.status(200).json({
      success: true,
      count: tasks.length,
      stats,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single assignment details by ID (with student's own progress status)
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const assignment = await Assignment.findById(req.params.id).populate('createdBy', 'name email role');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    // Authorization check: student can only view if scope is 'all', individual to them, or personal created by them
    const isAuthorized =
      assignment.scope === 'all' ||
      (assignment.scope === 'individual' && assignment.assignedTo && assignment.assignedTo.equals(studentId)) ||
      (assignment.scope === 'personal' && assignment.createdBy._id.equals(studentId));

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
    const status = progress ? progress.status : 'Pending';
    const isOverdue =
      status !== 'Completed' && new Date(assignment.dueDate).getTime() < now.getTime();

    const task = {
      _id: assignment._id,
      title: assignment.title,
      subject: assignment.subject,
      description: assignment.description,
      dueDate: assignment.dueDate,
      priority: assignment.priority,
      scope: assignment.scope,
      createdBy: assignment.createdBy,
      assignedTo: assignment.assignedTo,
      status,
      completedAt: progress ? progress.completedAt : null,
      isOverdue,
      isOwner: assignment.scope === 'personal' && assignment.createdBy._id.equals(studentId),
      createdAt: assignment.createdAt,
      updatedAt: progress ? progress.updatedAt : assignment.updatedAt,
    };

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new personal assignment
 *          Students can strictly create ONLY personal assignments for themselves.
 * @route   POST /api/tasks
 * @access  Private (Student)
 */
const createTask = async (req, res, next) => {
  try {
    const { title, subject, description, dueDate, priority, status } = req.body;

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

    const parsedDate = new Date(dueDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid due date.',
      });
    }

    // Enforce student rules: personal scope only, owned by the creator
    const assignment = await Assignment.create({
      title: title.trim(),
      subject: subject.trim(),
      description: description ? description.trim() : '',
      dueDate: parsedDate,
      priority: priority && ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
      scope: 'personal',
      createdBy: req.user._id,
      assignedTo: req.user._id,
    });

    const initialStatus = ['Pending', 'In Progress', 'Completed'].includes(status)
      ? status
      : 'Pending';

    // Create initial progress record
    const progress = await AssignmentProgress.create({
      assignment: assignment._id,
      student: req.user._id,
      status: initialStatus,
      completedAt: initialStatus === 'Completed' ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully!',
      task: {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        description: assignment.description,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
        createdBy: req.user._id,
        assignedTo: req.user._id,
        status: progress.status,
        completedAt: progress.completedAt,
        isOverdue:
          progress.status !== 'Completed' && new Date(assignment.dueDate).getTime() < Date.now(),
        isOwner: true,
        createdAt: assignment.createdAt,
        updatedAt: progress.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an assignment definition
 *          Students can update definition fields (title, subject, etc.) ONLY for personal tasks.
 *          For institution-wide or assigned tasks, students cannot edit definitions.
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const { title, subject, description, dueDate, priority, status } = req.body;

    // Check if the student owns the assignment definition
    const isOwner = assignment.scope === 'personal' && assignment.createdBy.equals(studentId);

    // If student is NOT owner (institution-wide or assigned coursework)
    if (!isOwner) {
      // Check if definition modifications were attempted
      const attemptedDefinitionChange =
        title !== undefined ||
        subject !== undefined ||
        description !== undefined ||
        dueDate !== undefined ||
        priority !== undefined;

      if (attemptedDefinitionChange) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You cannot modify institutional or assigned coursework definitions.',
        });
      }

      // If only status was updated, update this student's progress
      if (status !== undefined) {
        if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'Status must be Pending, In Progress, or Completed.',
          });
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
          message: 'Your progress has been updated!',
          task: {
            _id: assignment._id,
            title: assignment.title,
            subject: assignment.subject,
            description: assignment.description,
            dueDate: assignment.dueDate,
            priority: assignment.priority,
            scope: assignment.scope,
            status: progress.status,
            completedAt: progress.completedAt,
            isOwner: false,
          },
        });
      }
    }

    // For personal assignments owned by this student
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Assignment title cannot be empty.',
        });
      }
      assignment.title = title.trim();
    }

    if (subject !== undefined) {
      if (!subject.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Subject cannot be empty.',
        });
      }
      assignment.subject = subject.trim();
    }

    if (description !== undefined) {
      assignment.description = description.trim();
    }

    if (dueDate !== undefined) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid due date.',
        });
      }
      assignment.dueDate = parsedDate;
    }

    if (priority !== undefined) {
      if (!['High', 'Medium', 'Low'].includes(priority)) {
        return res.status(400).json({
          success: false,
          message: 'Priority must be High, Medium, or Low.',
        });
      }
      assignment.priority = priority;
    }

    await assignment.save();

    // If status is also provided, update progress record
    let currentStatus = 'Pending';
    let completedAt = null;
    if (status !== undefined) {
      if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be Pending, In Progress, or Completed.',
        });
      }
      const progress = await AssignmentProgress.findOneAndUpdate(
        { assignment: assignment._id, student: studentId },
        {
          status,
          completedAt: status === 'Completed' ? new Date() : null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      currentStatus = progress.status;
      completedAt = progress.completedAt;
    } else {
      const progress = await AssignmentProgress.findOne({
        assignment: assignment._id,
        student: studentId,
      });
      if (progress) {
        currentStatus = progress.status;
        completedAt = progress.completedAt;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Assignment updated successfully!',
      task: {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        description: assignment.description,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
        status: currentStatus,
        completedAt,
        isOwner: true,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quick status change (Pending, In Progress, Completed)
 *          Updates ONLY this student's independent progress record.
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
        message: 'Status must be Pending, In Progress, or Completed.',
      });
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    // Verify student is authorized to access this assignment
    const isAuthorized =
      assignment.scope === 'all' ||
      (assignment.scope === 'individual' && assignment.assignedTo && assignment.assignedTo.equals(studentId)) ||
      (assignment.scope === 'personal' && assignment.createdBy.equals(studentId));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You cannot update progress for this assignment.',
      });
    }

    // Upsert student's individual progress record
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
        title: assignment.title,
        subject: assignment.subject,
        dueDate: assignment.dueDate,
        priority: assignment.priority,
        scope: assignment.scope,
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
 * @desc    Delete an assignment
 *          Students can delete ONLY their personal assignments.
 *          Institution-wide or admin-assigned coursework CANNOT be deleted by students.
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    // Check ownership
    const isOwner = assignment.scope === 'personal' && assignment.createdBy.equals(studentId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Only your own personal assignments can be deleted.',
      });
    }

    // Delete assignment and cascade-delete progress records
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
  deleteTask,
};
