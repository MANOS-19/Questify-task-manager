const express = require("express");
const webpush = require("web-push");

const PushSubscription = require("../models/PushSubscription");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// VAPID CONFIGURATION
// ==========================================

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

const vapidConfigured = Boolean(
  publicKey &&
  privateKey &&
  vapidSubject
);

if (vapidConfigured) {
  webpush.setVapidDetails(
    vapidSubject,
    publicKey,
    privateKey
  );
}

// ==========================================
// GET PUBLIC VAPID KEY
// PUBLIC ROUTE
// ==========================================

router.get("/public-key", (req, res) => {
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: "Push notifications are not configured."
    });
  }

  return res.status(200).json({
    success: true,
    publicKey
  });
});

// ==========================================
// CHECK CURRENT ACCOUNT PUSH STATUS
// PROTECTED ROUTE
// ==========================================

router.get("/status", authMiddleware, async (req, res) => {
  try {
    const count = await PushSubscription.countDocuments({
      userId: req.user._id
    });

    return res.status(200).json({
      success: true,
      enabled: count > 0
    });
  } catch (error) {
    console.error("Push status error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check notification status."
    });
  }
});

// ==========================================
// SAVE PUSH SUBSCRIPTION
// PROTECTED ROUTE
// ==========================================

router.post(
  "/subscribe",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { subscription } = req.body;

      if (
        !subscription ||
        typeof subscription.endpoint !== "string" ||
        !subscription.endpoint.trim() ||
        typeof subscription.keys?.p256dh !== "string" ||
        typeof subscription.keys?.auth !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid subscription details."
        });
      }

      const endpoint = subscription.endpoint.trim();

      // The authenticated account owns this subscription.
      // If another account previously used this browser,
      // the endpoint is reassigned to the current account.

      await PushSubscription.findOneAndUpdate(
        { endpoint },
        {
          $set: {
            userId,
            endpoint,
            subscription,
            userAgent: req.headers["user-agent"] || ""
          },
          $unset: {
            browserId: ""
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true
        }
      );

      return res.status(201).json({
        success: true,
        message: "Push subscription saved successfully."
      });

    } catch (error) {
      console.error("Subscription error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not save push subscription."
      });
    }
  }
);

// ==========================================
// REMOVE PUSH SUBSCRIPTION
// PROTECTED ROUTE
// ==========================================

router.post(
  "/unsubscribe",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { endpoint } = req.body;

      if (
        typeof endpoint !== "string" ||
        !endpoint.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Subscription endpoint is required."
        });
      }

      const result = await PushSubscription.deleteOne({
        userId,
        endpoint: endpoint.trim()
      });

      return res.status(200).json({
        success: true,
        removed: result.deletedCount > 0,
        message: result.deletedCount
          ? "Subscription removed successfully."
          : "This browser subscription does not belong to this account."
      });

    } catch (error) {
      console.error("Unsubscribe error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not remove subscription."
      });
    }
  }
);

// ==========================================
// SEND TEST NOTIFICATION
// PROTECTED ROUTE
// ==========================================

router.post(
  "/test",
  authMiddleware,
  async (req, res) => {
    try {
      if (!vapidConfigured) {
        return res.status(503).json({
          success: false,
          message: "Push notification configuration is missing."
        });
      }

      const userId = req.user._id;

      // Never retrieve subscriptions belonging to other accounts.
      const subscriptions = await PushSubscription.find({
        userId
      }).lean();

      if (!subscriptions.length) {
        return res.status(404).json({
          success: false,
          message: "No push subscription found for this account."
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

            return true;

          } catch (error) {
            // Remove expired subscriptions only from
            // the authenticated account.

            if (
              error.statusCode === 404 ||
              error.statusCode === 410
            ) {
              await PushSubscription.deleteOne({
                _id: item._id,
                userId
              });
            }

            throw error;
          }
        })
      );

      const successful = results.filter(
        result => result.status === "fulfilled"
      ).length;

      return res.status(200).json({
        success: true,
        message: "Test notification completed.",
        successful,
        total: subscriptions.length
      });

    } catch (error) {
      console.error("Push test error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not send test notification."
      });
    }
  }
);

module.exports = router;