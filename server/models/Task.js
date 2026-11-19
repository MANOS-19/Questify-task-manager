const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  }
});

const attachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "text/plain"
      ]
    },
    size: {
      type: Number,
      required: true,
      min: 0,
      max: 900 * 1024
    },
    data: {
      type: String,
      required: true
    }
  },
  {
    _id: false
  }
);

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },

    category: {
      type: String,
      enum: ["Study", "Coding", "Fitness", "Personal", "Other"],
      default: "Study"
    },

    listName: {
      type: String,
      trim: true,
      default: "Inbox"
    },

    startDate: {
      type: String,
      default: ""
    },

    dueDate: {
      type: String,
      default: ""
    },

    dueTime: {
      type: String,
      default: ""
    },

    reminderMinutes: {
      type: Number,
      default: null,
      min: 0
    },

    recurrence: {
      type: String,
      enum: ["None", "Daily", "Weekly", "Monthly"],
      default: "None"
    },

    notes: {
      type: String,
      default: "",
      maxlength: 5000
    },

    subtasks: {
      type: [subtaskSchema],
      default: []
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: files => files.length <= 3,
        message: "A task can have a maximum of 3 attachments."
      }
    },

    completed: {
      type: Boolean,
      default: false
    },

    completedAt: {
      type: Date,
      default: null
    },

    lastReminderKey: {
      type: String,
      default: ""
    },

    nextOccurrenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null
    },

    recurrenceDayOfMonth: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Task", taskSchema);