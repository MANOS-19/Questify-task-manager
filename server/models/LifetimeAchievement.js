const mongoose = require("mongoose");

const lifetimeAchievementSchema = new mongoose.Schema(
  {
    browserId: {
      type: String,
      required: true,
      index: true
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

// One record per achievement for each browser.
lifetimeAchievementSchema.index(
  { browserId: 1, achievementKey: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "LifetimeAchievement",
  lifetimeAchievementSchema
);