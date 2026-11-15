const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const questionSchema = new mongoose.Schema(
  {
    // Unique ID for each question
    id: {
      type: String,
      required: true
    },

    question: {
      type: String,
      required: true
    },

    // Meaning of each emoji in order
    // Example: ["snow", "man"]
    parts: {
      type: [String],
      default: []
    },

    answer: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(this.options) &&
            this.options.includes(value)
          );
        },
        message: "The answer must be one of the options."
      }
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: options =>
          Array.isArray(options) &&
          options.length === 4 &&
          new Set(
            options.map(option => option.trim().toLowerCase())
          ).size === 4,
        message: "Each question must have four unique options."
      }
    },

    hint: {
      type: String,
      required: true
    },

    // "gemini" or "puzzle-bank"
    origin: {
      type: String,
      default: "puzzle-bank"
    }
  },
  {
    _id: false
  }
);

const dailyChallengeSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true
    },

    questions: {
      type: [questionSchema],
      validate: {
        validator: questions => questions.length === 10,
        message: "A daily challenge must have exactly 10 questions."
      }
    },

    // "gemini", "gemini+bank" or "puzzle-bank"
    source: {
      type: String
    },

    generatedBy: {
      type: String,
      default: "Google Gemini AI"
    },

    model: {
      type: String
    },

    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "DailyChallenge",
  dailyChallengeSchema
);