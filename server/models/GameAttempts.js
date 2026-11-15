const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true
    },

    selectedAnswer: {
      type: String,
      required: true
    },

    correct: {
      type: Boolean,
      required: true
    },

    answeredAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const gameAttemptSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true
    },

    date: {
      type: String,
      required: true
    },

    answers: {
      type: [answerSchema],
      default: []
    },

    score: {
      type: Number,
      default: 0
    },

    completed: {
      type: Boolean,
      default: false
    },

    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// One attempt per player per day
gameAttemptSchema.index(
  { playerId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("GameAttempt", gameAttemptSchema);