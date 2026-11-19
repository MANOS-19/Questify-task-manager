const mongoose = require("mongoose");

// ==========================================
// QUESTION SCHEMA
// ==========================================

const questionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true
    },

    question: {
      type: String,
      required: true,
      trim: true
    },

    parts: {
      type: [String],
      default: []
    },

    answer: {
      type: String,
      required: true,
      trim: true
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (options) {
          return (
            Array.isArray(options) &&
            options.length === 4 &&
            options.every(
              option =>
                typeof option === "string" &&
                option.trim().length > 0
            ) &&
            new Set(
              options.map(option =>
                option.trim().toLowerCase()
              )
            ).size === 4
          );
        },
        message: "Each question must have four unique options."
      }
    },

    hint: {
      type: String,
      required: true,
      trim: true
    },

    origin: {
      type: String,
      enum: ["gemini", "puzzle-bank"],
      default: "puzzle-bank"
    }
  },
  {
    _id: false
  }
);

// ==========================================
// DAILY CHALLENGE SCHEMA
// ==========================================

const dailyChallengeSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true
    },

    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: function (questions) {
          if (
            !Array.isArray(questions) ||
            questions.length !== 10
          ) {
            return false;
          }

          const questionIds = questions.map(q => q.id);

          return (
            new Set(questionIds).size === 10 &&
            questions.every(q =>
              q.options.includes(q.answer)
            )
          );
        },
        message:
          "A daily challenge must contain exactly 10 questions with unique IDs and valid answers."
      }
    },

    source: {
      type: String,
      enum: ["gemini", "gemini+bank", "puzzle-bank"]
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

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model(
  "DailyChallenge",
  dailyChallengeSchema
);
