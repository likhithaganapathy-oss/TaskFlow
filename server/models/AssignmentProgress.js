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
    // Assignment Submission System (PDF, DOCX, PPTX, or text)
    submission: {
      submitted: {
        type: Boolean,
        default: false,
      },
      fileData: {
        type: String, // Base64 data URI (up to 15MB)
        default: null,
      },
      fileName: {
        type: String,
        default: '',
      },
      fileType: {
        type: String,
        default: '',
      },
      fileSize: {
        type: Number,
        default: 0,
      },
      notes: {
        type: String,
        default: '',
        maxlength: [1000, 'Submission notes cannot exceed 1000 characters'],
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
    // Faculty Feedback and Grading System
    grade: {
      marks: {
        type: Number,
        default: null,
        min: 0,
      },
      maxMarks: {
        type: Number,
        default: 100,
      },
      feedback: {
        type: String,
        default: '',
        maxlength: [1500, 'Feedback cannot exceed 1500 characters'],
      },
      gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      gradedAt: {
        type: Date,
        default: null,
      },
    },
    // Study Planner and Pomodoro Tracking
    timeSpentMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    pomodoroSessions: {
      type: Number,
      default: 0,
      min: 0,
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
assignmentProgressSchema.index({ 'submission.submitted': 1 });

const AssignmentProgress = mongoose.model('AssignmentProgress', assignmentProgressSchema);

module.exports = AssignmentProgress;
