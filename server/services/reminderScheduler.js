const cron = require("node-cron");
const webpush = require("web-push");

const Task = require("../models/Task");
const PushSubscription = require("../models/PushSubscription");

const IST_OFFSET = "+05:30";

let schedulerStarted = false;


// Configure Web Push
function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID configuration is missing.");
  }

  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  );
}


// Convert task date and time into an IST timestamp
function getDueTimestamp(task) {
  if (!task.dueDate || !task.dueTime) {
    return NaN;
  }

  return new Date(
    `${task.dueDate}T${task.dueTime}:00${IST_OFFSET}`
  ).getTime();
}


// Check and send reminders
async function checkTaskReminders() {
  try {
    const now = Date.now();

    const tasks = await Task.find({
      completed: false,
      browserId: { $ne: "" },
      dueDate: { $ne: "" },
      dueTime: { $ne: "" },
      reminderMinutes: { $ne: null }
    });

    for (const task of tasks) {
      const minutes = Number(task.reminderMinutes);

      if (!Number.isFinite(minutes) || minutes < 0) {
        continue;
      }

      const dueTimestamp = getDueTimestamp(task);

      if (!Number.isFinite(dueTimestamp)) {
        continue;
      }

      const reminderTimestamp =
        dueTimestamp - minutes * 60 * 1000;

      // Allow a small delivery window after the reminder time.
      const deliveryDeadline = dueTimestamp + 60 * 1000;

      if (
        now < reminderTimestamp ||
        now >= deliveryDeadline
      ) {
        continue;
      }

      // Unique key for this task reminder.
      const reminderKey = [
        task.dueDate,
        task.dueTime,
        minutes
      ].join("-");

      // Prevent duplicate reminders.
      if (task.lastReminderKey === reminderKey) {
        continue;
      }

      const subscriptions = await PushSubscription.find({
        browserId: task.browserId
      });

      if (!subscriptions.length) {
        continue;
      }

      const payload = JSON.stringify({
        title: "Questify Reminder 🔔",
        body: `"${task.title}" is due soon!`,
        url: "/"
      });

      const results = await Promise.allSettled(
        subscriptions.map(async item => {
          try {
            await webpush.sendNotification(
              item.subscription,
              payload
            );

            return true;

          } catch (error) {
            // Remove expired subscriptions.
            if (
              error.statusCode === 404 ||
              error.statusCode === 410
            ) {
              await PushSubscription.deleteOne({
                _id: item._id
              });
            }

            throw error;
          }
        })
      );

      const successful = results.filter(
        result => result.status === "fulfilled"
      ).length;

      if (successful > 0) {
        task.lastReminderKey = reminderKey;

        await task.save();

        console.log(
          `[Reminder] Sent: ${task.title}`
        );
      }
    }

  } catch (error) {
    console.error(
      "[Reminder Scheduler Error]",
      error
    );
  }
}


// Start scheduler
function startReminderScheduler() {
  if (schedulerStarted) return;

  configureWebPush();

  schedulerStarted = true;

  console.log("[Reminder Scheduler] Started.");

  // Check every minute using Indian Standard Time.
  cron.schedule(
    "* * * * *",
    checkTaskReminders,
    {
      timezone: "Asia/Kolkata"
    }
  );

  // Also check once when the scheduler starts.
  checkTaskReminders();
}

module.exports = {
  startReminderScheduler,
  checkTaskReminders
};