const Group = require('../models/Group');

/**
 * @desc    Get all study/assignment groups
 * @route   GET /api/groups
 * @access  Private
 */
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({})
      .populate('members', 'name email rollNumber avatar branch')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new group
 * @route   POST /api/groups
 * @access  Private/Admin
 */
const createGroup = async (req, res, next) => {
  try {
    const { name, description, department, members } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      department: department ? department.trim() : '',
      members: Array.isArray(members) ? members : [],
      createdBy: req.user._id,
    });

    const populated = await Group.findById(group._id).populate(
      'members',
      'name email rollNumber avatar'
    );

    return res.status(201).json({
      success: true,
      message: `Group "${group.name}" created successfully!`,
      group: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update group members or details
 * @route   PUT /api/groups/:id
 * @access  Private/Admin
 */
const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const { name, description, department, members } = req.body;

    if (name && name.trim()) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (department !== undefined) group.department = department.trim();
    if (members !== undefined && Array.isArray(members)) group.members = members;

    await group.save();

    const populated = await Group.findById(group._id).populate(
      'members',
      'name email rollNumber avatar'
    );

    return res.status(200).json({
      success: true,
      message: `Group "${group.name}" updated successfully!`,
      group: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a group
 * @route   DELETE /api/groups/:id
 * @access  Private/Admin
 */
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    await Group.findByIdAndDelete(group._id);

    return res.status(200).json({
      success: true,
      message: `Group "${group.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
