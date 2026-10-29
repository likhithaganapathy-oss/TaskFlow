const mongoose = require('mongoose');

const assignmentProgressSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Progress record must reference an assignment'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Progress record must reference a student user'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Pending', 'In Progress', 'Completed'],
        message: 'Status must be Pending, In Progress, or Completed',
      },
      default: 'Pending',
    },
    completedAt: {
      type: Date,
      default: null,
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

// Compound unique index ensuring one progress record per student per assignment
assignmentProgressSchema.index({ assignment: 1, student: 1 }, { unique: true });
assignmentProgressSchema.index({ student: 1, status: 1 });

const AssignmentProgress = mongoose.model('AssignmentProgress', assignmentProgressSchema);

module.exports = AssignmentProgress;

