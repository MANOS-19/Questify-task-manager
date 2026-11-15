const mongoose = require("mongoose");

const lifetimeTaskCompletionSchema = new mongoose.Schema(
  {
    browserId: {
      type: String,
      required: true
    },

    taskId: {
      type: String,
      required: true
    },

    priority: {
      type: String,
      default: "Medium"
    },

    category: {
      type: String,
      default: "Study"
    },

    dueDate: {
      type: String,
      default: ""
    },

    completedAt: {
      type: Date,
      required: true
    },

    completionDate: {
      type: String,
      required: true
    },

    onTime: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Prevent the same task from being counted more than once.
lifetimeTaskCompletionSchema.index(
  { browserId: 1, taskId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "LifetimeTaskCompletion",
  lifetimeTaskCompletionSchema
);