const express = require("express");
const router = express.Router();

const Task = require("../models/Task");
const LifetimeTaskCompletion = require("../models/LifetimeTaskCompletion");

const {
  recordTaskCompletion,
  initializeLifetimeTaskHistory,
  refreshLifetimeAchievements,
  getRegularAchievements
} = require("../services/lifetimeAchievementService");

const ALLOWED_FIELDS = [
  "title",
  "priority",
  "category",
  "listName",
  "startDate",
  "dueDate",
  "dueTime",
  "reminderMinutes",
  "recurrence",
  "notes",
  "subtasks",
  "attachments",
  "completed",
  "browserId"
];

function pickTaskFields(body) {
  const data = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
}

// ----------------------------------------
// DATE HELPERS
// ----------------------------------------

// Parse YYYY-MM-DD without timezone conversion.
function parseDateParts(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(dateString || "")
  );

  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

// Format date as YYYY-MM-DD.
function formatDate(year, month, day) {
  return [
    year,
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

// Add days to a YYYY-MM-DD date.
function addDaysToDate(dateString, days) {
  const parts = parseDateParts(dateString);

  if (!parts) return "";

  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days)
  );

  return formatDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

// Calculate the next recurring date.
function getNextDate(dateString, recurrence, anchorDay = null) {
  const parts = parseDateParts(dateString);

  if (!parts) return "";

  const { year, month, day } = parts;

  if (recurrence === "Daily") {
    const date = new Date(Date.UTC(year, month - 1, day + 1));

    return formatDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }

  if (recurrence === "Weekly") {
    const date = new Date(Date.UTC(year, month - 1, day + 7));

    return formatDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }

  if (recurrence === "Monthly") {
    const nextMonth = new Date(Date.UTC(year, month, 1));

    const nextYear = nextMonth.getUTCFullYear();
    const nextMonthNumber = nextMonth.getUTCMonth() + 1;

    const lastDay = new Date(
      Date.UTC(nextYear, nextMonthNumber, 0)
    ).getUTCDate();

    const targetDay = Math.min(anchorDay || day, lastDay);

    return formatDate(nextYear, nextMonthNumber, targetDay);
  }

  return "";
}

// Calculate date difference in days.
function getDaysDifference(fromDate, toDate) {
  const from = parseDateParts(fromDate);
  const to = parseDateParts(toDate);

  if (!from || !to) return 0;

  const fromTime = Date.UTC(from.year, from.month - 1, from.day);
  const toTime = Date.UTC(to.year, to.month - 1, to.day);

  return Math.round((toTime - fromTime) / 86400000);
}

// ----------------------------------------
// RECURRING TASK HELPERS
// ----------------------------------------

async function createNextOccurrence(task, anchorDay) {
  const recurrence = task.recurrence;
  const baseDate = task.dueDate || task.startDate;

  const nextDate = getNextDate(
    baseDate,
    recurrence,
    anchorDay
  );

  if (!nextDate) {
    throw new Error(
      "A valid start date or due date is required for recurring tasks."
    );
  }

  const daysDifference = getDaysDifference(baseDate, nextDate);

  const nextStartDate = task.startDate
    ? getNextDate(
        task.startDate,
        recurrence,
        recurrence === "Monthly" ? anchorDay : null
      )
    : "";

  const nextTask = await Task.create({
    title: task.title,
    priority: task.priority,
    category: task.category,
    listName: task.listName,

    startDate: task.startDate
      ? (
          task.dueDate
            ? addDaysToDate(task.startDate, daysDifference)
            : nextStartDate
        )
      : "",

    dueDate: task.dueDate ? nextDate : "",
    dueTime: task.dueTime,

    reminderMinutes: task.reminderMinutes,
    recurrence: task.recurrence,
    recurrenceDayOfMonth: anchorDay,

    notes: task.notes,

    subtasks: (task.subtasks || []).map(subtask => ({
      title: subtask.title,
      completed: false
    })),

    attachments: task.attachments || [],

    completed: false,
    completedAt: null,

    browserId: task.browserId,
    lastReminderKey: "",
    nextOccurrenceId: null
  });

  return nextTask;
}

// ----------------------------------------
// CREATE TASK
// ----------------------------------------

router.post("/", async (req, res) => {
  try {
    const taskData = pickTaskFields(req.body);

    const savedTask = await Task.create({
      ...taskData,
      completedAt: taskData.completed === true
        ? new Date()
        : null
    });

    return res.status(201).json(savedTask);

  } catch (error) {
    console.error("Create Task Error:", error);

    return res.status(400).json({
      message: error.message
    });
  }
});

// ----------------------------------------
// GET ALL TASKS
// ----------------------------------------

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find()
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);

  } catch (error) {
    console.error("Fetch Tasks Error:", error);

    return res.status(500).json({
      message: error.message
    });
  }
});

// ----------------------------------------
// UPDATE TASK
// ----------------------------------------

router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    const wasCompleted = task.completed;

    const updates = pickTaskFields(req.body);

    Object.assign(task, updates);

    if (Object.prototype.hasOwnProperty.call(updates, "completed")) {
      if (task.completed && !wasCompleted) {
        task.completedAt = new Date();
      } else if (!task.completed) {
        task.completedAt = null;
      }
    }

    await task.save();

    // Record a unique completion in permanent history.
    if (!wasCompleted && task.completed && task.browserId) {
      try {
        await recordTaskCompletion(task.browserId, task);
      } catch (trackingError) {
        console.error(
          "Lifetime tracking error:",
          trackingError
        );
      }
    }

    return res.status(200).json(task);

  } catch (error) {
    console.error("Update Task Error:", error);

    return res.status(500).json({
      message: "Unable to update task."
    });
  }
});

// ----------------------------------------
// DELETE A CUSTOM LIST
// ----------------------------------------

router.delete("/list", async (req, res) => {
  try {
    const listName = String(
      req.query.name || ""
    ).trim();

    if (!listName) {
      return res.status(400).json({
        message: "List name is required."
      });
    }

    if (listName.toLowerCase() === "inbox") {
      return res.status(400).json({
        message: "The default Inbox cannot be deleted."
      });
    }

    const result = await Task.deleteMany({
      listName
    });

    return res.status(200).json({
      message: `List "${listName}" and its tasks were deleted.`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("Delete List Error:", error);

    return res.status(500).json({
      message: error.message
    });
  }
});

// ----------------------------------------
// DELETE INDIVIDUAL TASK
// ----------------------------------------

router.delete("/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(
      req.params.id
    );

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    return res.status(200).json({
      message: "Task deleted successfully."
    });

  } catch (error) {
    console.error("Delete Task Error:", error);

    return res.status(400).json({
      message: error.message
    });
  }
});

// ----------------------------------------
// ANALYTICS HELPERS
// ----------------------------------------

const ANALYTICS_XP = {
  Low: 10,
  Medium: 20,
  High: 40
};

// Get date in Asia/Kolkata.
function getAnalyticsISTDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;

  return `${year}-${month}-${day}`;
}

// Shift a YYYY-MM-DD date without timezone conversion.
function shiftAnalyticsDate(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day + days)
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

// Calculate the current consecutive-day streak.
function getAnalyticsStreak(completions, today) {
  const dates = new Set(
    completions
      .map(item => item.completionDate)
      .filter(Boolean)
  );

  let currentDate = dates.has(today)
    ? today
    : shiftAnalyticsDate(today, -1);

  let streak = 0;

  while (dates.has(currentDate)) {
    streak++;
    currentDate = shiftAnalyticsDate(currentDate, -1);
  }

  return streak;
}

// Create the last seven days of activity.
function getAnalyticsWeeklyActivity(completions, today) {
  const activityMap = {};

  completions.forEach(item => {
    const date = item.completionDate;

    if (!date) return;

    activityMap[date] = (activityMap[date] || 0) + 1;
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftAnalyticsDate(
      today,
      index - 6
    );

    const weekday = new Date(
      `${date}T00:00:00Z`
    );

    return {
      date,
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC"
      }).format(weekday),
      count: activityMap[date] || 0
    };
  });
}

// ----------------------------------------
// GET UNIFIED PRODUCTIVITY ANALYTICS
// ----------------------------------------

router.get("/analytics/:browserId", async (req, res) => {
  try {
    const { browserId } = req.params;

    if (!browserId) {
      return res.status(400).json({
        success: false,
        message: "Browser ID is required."
      });
    }

    // Import existing completed tasks before calculating history.
    await initializeLifetimeTaskHistory(browserId);

    // ----------------------------------------
    // CURRENT TASK STATUS
    // ----------------------------------------

    const tasks = await Task.find({
      browserId
    })
      .select("priority category completed")
      .lean();

    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      task => task.completed
    ).length;

    const pendingTasks = totalTasks - completedTasks;

    const completionRate = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Current category status.
    const categories = {};

    tasks.forEach(task => {
      const category = task.category || "Study";

      if (!categories[category]) {
        categories[category] = {
          total: 0,
          done: 0
        };
      }

      categories[category].total++;

      if (task.completed) {
        categories[category].done++;
      }
    });

    // Current priority status.
    const priorities = ["High", "Medium", "Low"].map(priority => {
      const matching = tasks.filter(
        task => task.priority === priority
      );

      return {
        name: priority,
        total: matching.length,
        completed: matching.filter(
          task => task.completed
        ).length
      };
    });

    // ----------------------------------------
    // PERMANENT COMPLETION HISTORY
    // ----------------------------------------

    const completions = await LifetimeTaskCompletion.find({
      browserId
    })
      .select("priority category completionDate completedAt")
      .lean();

    const totalHistoricalCompletions = completions.length;

    // ----------------------------------------
    // PERMANENT CATEGORY PERFORMANCE
    // ----------------------------------------

    const categoryCounts = {};

    completions.forEach(item => {
      const category = item.category || "Study";

      categoryCounts[category] =
        (categoryCounts[category] || 0) + 1;
    });

    const historicalCategories = Object.entries(
      categoryCounts
    ).map(([name, count]) => ({
      name,
      count,
      percentage: totalHistoricalCompletions
        ? Math.round(
            (count / totalHistoricalCompletions) * 100
          )
        : 0
    }));

    // ----------------------------------------
    // PERMANENT PRIORITY BREAKDOWN
    // ----------------------------------------

    const priorityCounts = {
      High: 0,
      Medium: 0,
      Low: 0
    };

    completions.forEach(item => {
      const priority = item.priority || "Medium";

      if (
        Object.prototype.hasOwnProperty.call(
          priorityCounts,
          priority
        )
      ) {
        priorityCounts[priority]++;
      }
    });

    const historicalPriorities = Object.entries(
      priorityCounts
    ).map(([name, count]) => ({
      name,
      count,
      percentage: totalHistoricalCompletions
        ? Math.round(
            (count / totalHistoricalCompletions) * 100
          )
        : 0
    }));

    // ----------------------------------------
    // PERMANENT XP
    // ----------------------------------------

    const xp = completions.reduce(
      (sum, item) =>
        sum + (ANALYTICS_XP[item.priority] || 10),
      0
    );

    // Level calculation.
    let level = 1;
    let rest = xp;

    while (rest >= level * 100) {
      rest -= level * 100;
      level++;
    }

    const needed = level * 100;

    const pct = Math.round(
      (rest / needed) * 100
    );

    // ----------------------------------------
    // PERMANENT WEEKLY ACTIVITY AND STREAK
    // ----------------------------------------

    const today = getAnalyticsISTDate();

    const week = getAnalyticsWeeklyActivity(
      completions,
      today
    );

    const streak = getAnalyticsStreak(
      completions,
      today
    );

    // ----------------------------------------
    // RESPONSE
    // ----------------------------------------

    return res.status(200).json({
      success: true,

      // Current task status.
      taskStats: {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate,
        categories,
        priorities
      },

      // Permanent productivity progress.
      productivity: {
        xp,
        level,
        rest,
        needed,
        pct,
        streak
      },

      // Permanent completion statistics.
      historyStats: {
        totalCompleted: totalHistoricalCompletions,
        categories: historicalCategories,
        priorities: historicalPriorities
      },

      // Permanent weekly activity.
      week
    });

  } catch (error) {
    console.error("Unified Analytics Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to calculate productivity analytics."
    });
  }
});

// ----------------------------------------
// GET LIFETIME ACHIEVEMENTS
// ----------------------------------------

router.get("/lifetime-achievements/:browserId", async (req, res) => {
  try {
    const { browserId } = req.params;

    await initializeLifetimeTaskHistory(browserId);

    const achievements = await refreshLifetimeAchievements(
      browserId
    );

    return res.status(200).json({
      success: true,
      achievements
    });

  } catch (error) {
    console.error("Lifetime Achievements Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch lifetime achievements."
    });
  }
});

// ----------------------------------------
// GET REGULAR ACHIEVEMENTS
// ----------------------------------------

router.get("/regular-achievements/:browserId", async (req, res) => {
  try {
    const { browserId } = req.params;

    const achievements = await getRegularAchievements(browserId);

    return res.status(200).json({
      success: true,
      achievements
    });

  } catch (error) {
    console.error("Regular Achievements Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch regular achievements."
    });
  }
});

// ----------------------------------------
// GET WEEKLY ACTIVITY
// ----------------------------------------

router.get("/weekly-activity/:browserId", async (req, res) => {
  try {
    const { browserId } = req.params;
    const { startDate, endDate } = req.query;

    if (!browserId) {
      return res.status(400).json({
        success: false,
        message: "Browser ID is required."
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(startDate || "") ||
      !datePattern.test(endDate || "") ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid start and end dates are required."
      });
    }

    await initializeLifetimeTaskHistory(browserId);

    const activity = await LifetimeTaskCompletion.aggregate([
      {
        $match: {
          browserId,
          completionDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: "$completionDate",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1
        }
      },
      {
        $sort: {
          date: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      activity
    });

  } catch (error) {
    console.error("Weekly Activity Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch weekly activity."
    });
  }
});

module.exports = router;