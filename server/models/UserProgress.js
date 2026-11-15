const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema(
  {
    browserId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    totalTasksCompleted: {
      type: Number,
      default: 0
    },

    taskCompletionDates: {
      type: [String],
      default: []
    },

    dailyChallengesCompleted: {
      type: Number,
      default: 0
    },

    perfectChallenges: {
      type: Number,
      default: 0
    },

    challengeCompletionDates: {
      type: [String],
      default: []
    },

    perfectChallengeDates: {
      type: [String],
      default: []
    },
    tasksInitialized: {
  type: Boolean,
  default: false
}
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("UserProgress", userProgressSchema);