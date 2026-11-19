const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    subscription: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    userAgent: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema
);