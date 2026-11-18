const Subject = require('../models/Subject');

/**
 * @desc    Get all academic subjects
 * @route   GET /api/subjects
 * @access  Private
 */
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({}).sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new subject
 * @route   POST /api/subjects
 * @access  Private/Admin
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code, department, semester, description } = req.body;

    if (!name || !code || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and department are required.',
      });
    }

    const existing = await Subject.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Subject with code "${code}" already exists.`,
      });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      department: department.trim(),
      semester: Number(semester) || 1,
      description: description ? description.trim() : '',
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: `Subject "${subject.name}" (${subject.code}) created successfully!`,
      subject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a subject
 * @route   PUT /api/subjects/:id
 * @access  Private/Admin
 */
const updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const { name, code, department, semester, description } = req.body;

    if (name && name.trim()) subject.name = name.trim();
    if (code && code.trim()) {
      const normalizedCode = code.toUpperCase().trim();
      const codeExists = await Subject.findOne({ code: normalizedCode, _id: { $ne: subject._id } });
      if (codeExists) {
        return res.status(409).json({ success: false, message: `Code "${code}" already in use.` });
      }
      subject.code = normalizedCode;
    }
    if (department && department.trim()) subject.department = department.trim();
    if (semester !== undefined) subject.semester = Number(semester);
    if (description !== undefined) subject.description = description.trim();

    await subject.save();

    return res.status(200).json({
      success: true,
      message: `Subject "${subject.name}" updated successfully!`,
      subject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a subject
 * @route   DELETE /api/subjects/:id
 * @access  Private/Admin
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    await Subject.findByIdAndDelete(subject._id);

    return res.status(200).json({
      success: true,
      message: `Subject "${subject.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
