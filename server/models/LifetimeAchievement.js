const mongoose = require("mongoose");

const lifetimeAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    achievementKey: {
      type: String,
      required: true
    },

    title: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    icon: {
      type: String,
      default: "🏅"
    },

    progress: {
      type: Number,
      default: 0
    },

    target: {
      type: Number,
      required: true
    },

    unlocked: {
      type: Boolean,
      default: false
    },

    unlockedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

lifetimeAchievementSchema.index(
  {
    userId: 1,
    achievementKey: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model(
  "LifetimeAchievement",
  lifetimeAchievementSchema
);