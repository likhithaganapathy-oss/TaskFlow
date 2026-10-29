const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      maxlength: [120, 'Assignment title cannot exceed 120 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject/Course name is required'],
      trim: true,
      maxlength: [60, 'Subject name cannot exceed 60 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    priority: {
      type: String,
      required: true,
      enum: {
        values: ['High', 'Medium', 'Low'],
        message: 'Priority must be High, Medium, or Low',
      },
      default: 'Medium',
    },
    scope: {
      type: String,
      required: true,
      enum: {
        values: ['all', 'individual', 'personal'],
        message: 'Scope must be all, individual, or personal',
      },
      default: 'personal',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assignment must have a creator'],
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for high performance querying
assignmentSchema.index({ scope: 1, dueDate: 1 });
assignmentSchema.index({ assignedTo: 1, dueDate: 1 });
assignmentSchema.index({ createdBy: 1, dueDate: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;

