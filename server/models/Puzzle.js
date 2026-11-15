
const mongoose = require("mongoose");

const puzzleSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },

    // Meaning of each emoji in order
    parts: {
      type: [String],
      required: true
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
            options.length === 4 &&
            new Set(
              options.map(option => option.trim().toLowerCase())
            ).size === 4 &&
            options.some(
              option =>
                option.trim().toLowerCase() ===
                this.answer.trim().toLowerCase()
            )
          );
        },
        message: "Four unique options including the correct answer are required."
      }
    },

    hint: {
      type: String,
      required: true
    },

    origin: {
      type: String,
      enum: ["gemini", "puzzle-bank"],
      default: "gemini"
    },

    generatedForDate: {
      type: String,
      required: true
    },

    model: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Puzzle", puzzleSchema);
