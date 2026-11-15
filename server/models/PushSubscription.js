const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    browserId: {
      type: String,
      required: true,
      index: true
    },
    endpoint: {
      type: String,
      required: true,
      unique: true
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
  { timestamps: true }
);

module.exports = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema
);