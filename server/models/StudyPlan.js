const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // Stored as YYYY-MM-DD for fast date matching
      required: true,
      index: true,
    },
    plannedTasks: [
      {
        assignment: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Assignment',
          default: null,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        subject: {
          type: String,
          default: 'General',
        },
        plannedMinutes: {
          type: Number,
          default: 30,
          min: 5,
        },
        completedMinutes: {
          type: Number,
          default: 0,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
      },
    ],
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a student only has one plan document per calendar date
studyPlanSchema.index({ student: 1, date: 1 }, { unique: true });

const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);

module.exports = StudyPlan;
