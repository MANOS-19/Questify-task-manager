const express = require("express");
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

const router = express.Router();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

const vapidConfigured = Boolean(
  publicKey && privateKey && vapidSubject
);

if (vapidConfigured) {
  webpush.setVapidDetails(
    vapidSubject,
    publicKey,
    privateKey
  );
}

// Get public VAPID key
router.get("/public-key", (req, res) => {
  if (!publicKey) {
    return res.status(500).json({
      message: "VAPID public key is missing"
    });
  }

  res.json({ publicKey });
});

// Save browser subscription
router.post("/subscribe", async (req, res) => {
  try {
    const { browserId, subscription } = req.body;

    if (
      !browserId ||
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return res.status(400).json({
        message: "Invalid subscription details"
      });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        browserId,
        endpoint: subscription.endpoint,
        subscription,
        userAgent: req.headers["user-agent"] || ""
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    res.status(201).json({
      message: "Push subscription saved successfully"
    });
  } catch (error) {
    console.error("Subscription error:", error);

    res.status(500).json({
      message: "Could not save subscription"
    });
  }
});

// Remove browser subscription
router.post("/unsubscribe", async (req, res) => {
  try {
    const { browserId, endpoint } = req.body;

    if (!browserId || !endpoint) {
      return res.status(400).json({
        message: "Browser ID and endpoint are required"
      });
    }

    await PushSubscription.deleteOne({
      browserId,
      endpoint
    });

    res.json({
      message: "Subscription removed"
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not remove subscription"
    });
  }
});

// Send a test notification
router.post("/test", async (req, res) => {
  try {
    if (!vapidConfigured) {
      return res.status(500).json({
        message: "VAPID configuration is missing"
      });
    }

    const { browserId } = req.body;

    if (!browserId) {
      return res.status(400).json({
        message: "Browser ID is required"
      });
    }

    const subscriptions = await PushSubscription.find({ browserId });

    if (!subscriptions.length) {
      return res.status(404).json({
        message: "No push subscription found"
      });
    }

    const payload = JSON.stringify({
      title: "Questify",
      body: "Your push notifications are working!",
      url: "/"
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (item) => {
        try {
          await webpush.sendNotification(
            item.subscription,
            payload
          );
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: item._id });
          }
          throw error;
        }
      })
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    res.json({
      message: "Test notification sent",
      successful
    });
  } catch (error) {
    console.error("Push test error:", error);

    res.status(500).json({
      message: "Could not send test notification"
    });
  }
});

module.exports = router;