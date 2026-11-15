const Task = require("../models/Task");
const UserProgress = require("../models/UserProgress");
const LifetimeTaskCompletion = require("../models/LifetimeTaskCompletion");
const LifetimeAchievement = require("../models/LifetimeAchievement");

const DAY_MS = 24 * 60 * 60 * 1000;

const ALLOWED_CATEGORIES = [
  "Study",
  "Coding",
  "Fitness",
  "Personal",
  "Other"
];

// ----------------------------------------
// 25 LIFETIME ACHIEVEMENTS
// ----------------------------------------

const ACHIEVEMENTS = [

  // A. TASK COMPLETION MILESTONES (8)

  {
    achievementKey: "momentum_builder",
    title: "Momentum Builder",
    description: "Complete 25 tasks",
    icon: "🌱",
    target: 25,
    getProgress: stats => stats.totalTasks
  },
  {
    achievementKey: "productivity_pro",
    title: "Productivity Pro",
    description: "Complete 50 tasks",
    icon: "🚀",
    target: 50,
    getProgress: stats => stats.totalTasks
  },
  {
    achievementKey: "task_legend",
    title: "Task Legend",
    description: "Complete 100 tasks",
    icon: "👑",
    target: 100,
    getProgress: stats => stats.totalTasks
  },
  {
    achievementKey: "quest_champion",
    title: "Quest Champion",
    description: "Complete 250 tasks",
    icon: "🏆",
    target: 250,
    getProgress: stats => stats.totalTasks
  },
  {
    achievementKey: "task_titan",
    title: "Task Titan",
    description: "Complete 500 tasks",
    icon: "💪",
    target: 500,
    getProgress: stats => stats.totalTasks
  },
  {
    achievementKey: "elite_performer",
    title: "Elite Performer",
    description: "Complete 750 tasks",
    icon: "🌟",
    target: 750,
    getProgress: stats => stats.totalTasks
  },
  {
    achievementKey: "ultimate_achiever",
    title: "Ultimate Achiever",
    description: "Complete 1,000 tasks",
    icon: "💎",
    target: 1000,
    getProgress: stats => stats.totalTasks
  },
  {
    achievementKey: "unstoppable_achiever",
    title: "Unstoppable Achiever",
    description: "Complete 1,500 tasks",
    icon: "🔥",
    target: 1500,
    getProgress: stats => stats.totalTasks
  },

  // B. STREAK ACHIEVEMENTS (6)

  {
    achievementKey: "three_day_starter",
    title: "Three-Day Starter",
    description: "Maintain a 3-day completion streak",
    icon: "🔥",
    target: 3,
    getProgress: stats => stats.longestStreak
  },
  {
    achievementKey: "week_warrior",
    title: "Week Warrior",
    description: "Maintain a 7-day completion streak",
    icon: "⚔️",
    target: 7,
    getProgress: stats => stats.longestStreak
  },
  {
    achievementKey: "fortnight_focus",
    title: "Fortnight Focus",
    description: "Maintain a 14-day completion streak",
    icon: "🎯",
    target: 14,
    getProgress: stats => stats.longestStreak
  },
  {
    achievementKey: "monthly_master",
    title: "Monthly Master",
    description: "Maintain a 30-day completion streak",
    icon: "💎",
    target: 30,
    getProgress: stats => stats.longestStreak
  },
  {
    achievementKey: "half_century_hero",
    title: "Half-Century Hero",
    description: "Maintain a 50-day completion streak",
    icon: "🌟",
    target: 50,
    getProgress: stats => stats.longestStreak
  },
  {
    achievementKey: "century_legend",
    title: "Century Legend",
    description: "Maintain a 100-day completion streak",
    icon: "🏅",
    target: 100,
    getProgress: stats => stats.longestStreak
  },

 // C. PRIORITY ACHIEVEMENTS (3)

{
  achievementKey: "priority_starter",
  title: "Priority Starter",
  description: "Complete 25 high-priority tasks",
  icon: "⚡",
  target: 25,
  getProgress: stats => stats.highPriorityTasks
},
{
  achievementKey: "priority_champion",
  title: "Priority Champion",
  description: "Complete 50 high-priority tasks",
  icon: "🔥",
  target: 50,
  getProgress: stats => stats.highPriorityTasks
},
{
  achievementKey: "high_impact_hero",
  title: "High-Impact Hero",
  description: "Complete 100 high-priority tasks",
  icon: "🏆",
  target: 100,
  getProgress: stats => stats.highPriorityTasks
},
  // D. CATEGORY ACHIEVEMENTS (4)

  {
    achievementKey: "category_explorer",
    title: "Category Explorer",
    description: "Complete tasks in all 5 categories",
    icon: "🌈",
    target: 5,
    getProgress: stats => stats.categoryCount
  },
  {
    achievementKey: "well_rounded",
    title: "Well-Rounded",
    description: "Complete at least 5 tasks in 3 different categories",
    icon: "🌍",
    target: 3,
    getProgress: stats => stats.categoriesWithFiveTasks
  },
  {
    achievementKey: "category_master",
    title: "Category Master",
    description: "Complete 25 tasks in any one category",
    icon: "🎓",
    target: 25,
    getProgress: stats => stats.mostCompletedCategory
  },
  {
    achievementKey: "all_rounder",
    title: "All-Rounder",
    description: "Complete at least 5 tasks in every category",
    icon: "🧩",
    target: 5,
    getProgress: stats => stats.leastCompletedCategory
  },

  // E. DEADLINE ACHIEVEMENTS (4)

  {
    achievementKey: "on_time_starter",
    title: "On-Time Starter",
    description: "Complete 10 tasks on or before their deadlines",
    icon: "⏰",
    target: 10,
    getProgress: stats => stats.onTimeTasks
  },
  {
    achievementKey: "deadline_hero",
    title: "Deadline Hero",
    description: "Complete 25 tasks on or before their deadlines",
    icon: "🎯",
    target: 25,
    getProgress: stats => stats.onTimeTasks
  },
  {
    achievementKey: "deadline_dominator",
    title: "Deadline Dominator",
    description: "Complete 50 tasks on or before their deadlines",
    icon: "🏅",
    target: 50,
    getProgress: stats => stats.onTimeTasks
  },
  {
    achievementKey: "early_planner",
    title: "Early Planner",
    description: "Complete 10 tasks at least one day before their deadlines",
    icon: "📅",
    target: 10,
    getProgress: stats => stats.earlyTasks
  }

];

// ----------------------------------------
// DATE HELPERS
// ----------------------------------------

function getISTDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getDateDifference(laterDate, earlierDate) {
  const later = Date.parse(`${laterDate}T00:00:00Z`);
  const earlier = Date.parse(`${earlierDate}T00:00:00Z`);

  if (Number.isNaN(later) || Number.isNaN(earlier)) {
    return 0;
  }

  return Math.round((later - earlier) / DAY_MS);
}

// ----------------------------------------
// STREAK CALCULATION
// ----------------------------------------

function calculateLongestStreak(completions) {
  const dates = [
    ...new Set(
      completions
        .map(item => item.completionDate)
        .filter(Boolean)
    )
  ].sort();

  let longest = 0;
  let current = 0;
  let previousDate = null;

  for (const date of dates) {
    const currentDate = Date.parse(`${date}T00:00:00Z`);

    if (
      previousDate !== null &&
      currentDate - previousDate === DAY_MS
    ) {
      current++;
    } else {
      current = 1;
    }

    longest = Math.max(longest, current);
    previousDate = currentDate;
  }

  return longest;
}

// ----------------------------------------
// GET ACTUAL ACHIEVEMENT UNLOCK DATE
// ----------------------------------------

function getAchievementUnlockDate(achievement, completions) {
  const ordered = [...completions].sort(
    (a, b) =>
      new Date(a.completedAt) - new Date(b.completedAt)
  );

  const getDate = item => {
    if (!item) return null;

    const date = item.completedAt
      ? new Date(item.completedAt)
      : new Date(`${item.completionDate}T12:00:00+05:30`);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const nthCompletion = items => {
    return getDate(items[achievement.target - 1]);
  };

  const key = achievement.achievementKey;

  // TASK COMPLETION MILESTONES

  if ([
    "momentum_builder",
    "productivity_pro",
    "task_legend",
    "quest_champion",
    "task_titan",
    "elite_performer",
    "ultimate_achiever",
    "unstoppable_achiever"
  ].includes(key)) {
    return nthCompletion(ordered);
  }

  // PRIORITY MILESTONES

  if ([
    "priority_starter",
    "priority_champion",
    "high_impact_hero"
  ].includes(key)) {
    return nthCompletion(
      ordered.filter(item => item.priority === "High")
    );
  }

  // DEADLINE MILESTONES

  if ([
    "on_time_starter",
    "deadline_hero",
    "deadline_dominator"
  ].includes(key)) {
    return nthCompletion(
      ordered.filter(item => item.onTime)
    );
  }

  if (key === "early_planner") {
    return nthCompletion(
      ordered.filter(item =>
        item.dueDate &&
        getDateDifference(
          item.dueDate,
          item.completionDate
        ) >= 1
      )
    );
  }

  // CATEGORY MILESTONES

  const categoryCounts = Object.fromEntries(
    ALLOWED_CATEGORIES.map(category => [category, 0])
  );

  for (const item of ordered) {
    const category = item.category;

    if (!Object.hasOwn(categoryCounts, category)) {
      continue;
    }

    categoryCounts[category]++;

    const counts = Object.values(categoryCounts);

    if (
      key === "category_explorer" &&
      counts.filter(count => count > 0).length >= 5
    ) {
      return getDate(item);
    }

    if (
      key === "well_rounded" &&
      counts.filter(count => count >= 5).length >= 3
    ) {
      return getDate(item);
    }

    if (
      key === "category_master" &&
      categoryCounts[category] >= 25
    ) {
      return getDate(item);
    }

    if (
      key === "all_rounder" &&
      counts.every(count => count >= 5)
    ) {
      return getDate(item);
    }
  }

  // STREAK MILESTONES

  if ([
    "three_day_starter",
    "week_warrior",
    "fortnight_focus",
    "monthly_master",
    "half_century_hero",
    "century_legend"
  ].includes(key)) {
    const dates = [
      ...new Set(
        ordered
          .map(item => item.completionDate)
          .filter(Boolean)
      )
    ].sort();

    let streak = 0;
    let previousDate = null;

    for (const date of dates) {
      if (
        previousDate &&
        getDateDifference(date, previousDate) === 1
      ) {
        streak++;
      } else {
        streak = 1;
      }

      if (streak >= achievement.target) {
        const finalDay = ordered.find(
          item => item.completionDate === date
        );

        return getDate(finalDay);
      }

      previousDate = date;
    }
  }

  return null;
}

// ----------------------------------------
// INITIALIZE EXISTING COMPLETED TASKS
// ----------------------------------------

async function initializeLifetimeTaskHistory(browserId) {
  const progress = await UserProgress.findOne({
    browserId
  })
    .select("tasksInitialized")
    .lean();

  if (progress?.tasksInitialized) {
    return;
  }

  const completedTasks = await Task.find({
    browserId,
    completed: true
  })
    .select("_id priority category dueDate completedAt updatedAt")
    .lean();

  const operations = completedTasks.map(task => {
    const completedAt =
      task.completedAt || task.updatedAt || new Date();

    const completionDate = getISTDate(completedAt);
    const dueDate = String(task.dueDate || "").slice(0, 10);

    return {
      updateOne: {
        filter: {
          browserId,
          taskId: String(task._id)
        },
        update: {
          $setOnInsert: {
            browserId,
            taskId: String(task._id),
            priority: task.priority || "Medium",
            category: task.category || "Study",
            dueDate,
            completedAt,
            completionDate,
            onTime: Boolean(dueDate) && completionDate <= dueDate
          }
        },
        upsert: true
      }
    };
  });

  if (operations.length > 0) {
    await LifetimeTaskCompletion.bulkWrite(operations, {
      ordered: false
    });
  }

  await UserProgress.updateOne(
    { browserId },
    {
      $set: {
        tasksInitialized: true
      }
    },
    {
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  console.log(
    `[lifetime] Imported ${completedTasks.length} existing tasks.`
  );
}

// ----------------------------------------
// CALCULATE LIFETIME STATISTICS
// ----------------------------------------

async function calculateLifetimeStats(browserId) {
  const completions = await LifetimeTaskCompletion.find({
    browserId
  }).lean();

  const categoryCounts = Object.fromEntries(
    ALLOWED_CATEGORIES.map(category => [category, 0])
  );

  let highPriorityTasks = 0;
  let onTimeTasks = 0;
  let earlyTasks = 0;

  for (const item of completions) {
    if (item.priority === "High") {
      highPriorityTasks++;
    }

    if (Object.hasOwn(categoryCounts, item.category)) {
      categoryCounts[item.category]++;
    }

    if (item.onTime) {
      onTimeTasks++;
    }

    if (
      item.dueDate &&
      getDateDifference(item.dueDate, item.completionDate) >= 1
    ) {
      earlyTasks++;
    }
  }

  const categoryValues = Object.values(categoryCounts);

  const categoriesWithFiveTasks = categoryValues.filter(
    count => count >= 5
  ).length;

  const mostCompletedCategory = Math.max(...categoryValues);
  const leastCompletedCategory = Math.min(...categoryValues);

  const categoryCount = categoryValues.filter(
    count => count > 0
  ).length;

  const longestStreak = calculateLongestStreak(completions);

  return {
    totalTasks: completions.length,
    highPriorityTasks,
    onTimeTasks,
    earlyTasks,
    categoryCount,
    categoriesWithFiveTasks,
    mostCompletedCategory,
    leastCompletedCategory,
    longestStreak,
    completions
  };
}


// ----------------------------------------
// REGULAR ACHIEVEMENTS
// Based on permanent completion history
// ----------------------------------------

// ----------------------------------------
// CURRENT STREAK CALCULATION
// ----------------------------------------

function calculateCurrentStreakDetails(completions) {
  const dates = new Set(
    completions
      .map(item => item.completionDate)
      .filter(Boolean)
  );

  const today = getISTDate();

  function previousDate(dateString) {
    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day - 1)
    );

    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")
    ].join("-");
  }

  // Allow today's activity or yesterday's activity
  // to keep the streak active until today ends.
  let currentDate = dates.has(today)
    ? today
    : previousDate(today);

  if (!dates.has(currentDate)) {
    return {
      currentStreak: 0,
      streakStartDate: null
    };
  }

  let currentStreak = 0;
  let streakStartDate = currentDate;

  while (dates.has(currentDate)) {
    currentStreak++;

    streakStartDate = currentDate;

    currentDate = previousDate(currentDate);
  }

  return {
    currentStreak,
    streakStartDate
  };
}


// ----------------------------------------
// GET DAILY REGULAR ACHIEVEMENTS
// ----------------------------------------

async function getRegularAchievements(browserId) {
  if (!browserId) {
    throw new Error("Browser ID is required.");
  }

  await initializeLifetimeTaskHistory(browserId);

  const stats = await calculateLifetimeStats(browserId);

  // Current date in Indian Standard Time.
  const today = getISTDate();

  // Only count unique tasks completed today.
  const todayCompletions = stats.completions.filter(
    item => item.completionDate === today
  );

  const dailyTaskCount = todayCompletions.length;

  const dailyHighPriority = todayCompletions.filter(
    item => item.priority === "High"
  ).length;

  const dailyCategories = new Set(
    todayCompletions.map(
      item => item.category || "Study"
    )
  );

  // Calculate the active streak separately.
  const {
    currentStreak,
    streakStartDate
  } = calculateCurrentStreakDetails(stats.completions);

  // Every three consecutive days earns a new milestone.
  const consistencyProgress = currentStreak === 0
    ? 0
    : currentStreak % 3 === 0
      ? 3
      : currentStreak % 3;

  const consistencyMilestones = Math.floor(
    currentStreak / 3
  );

  const consistencyMilestonesList = Array.from(
    { length: consistencyMilestones },
    (_, index) => ({
      id: `${streakStartDate}:${(index + 1) * 3}`,
      days: (index + 1) * 3
    })
  );

  return [

    {
      achievementKey: "first_quest",
      title: "First Quest",
      description: "Complete 1 task today",
      icon: "🚀",
      progress: dailyTaskCount,
      target: 1,
      unlocked: dailyTaskCount >= 1,
      date: today
    },

    {
      achievementKey: "on_a_roll",
      title: "On a Roll",
      description: "Complete 5 tasks today",
      icon: "🔥",
      progress: dailyTaskCount,
      target: 5,
      unlocked: dailyTaskCount >= 5,
      date: today
    },

    {
      achievementKey: "task_master",
      title: "Task Master",
      description: "Complete 10 tasks today",
      icon: "🏆",
      progress: dailyTaskCount,
      target: 10,
      unlocked: dailyTaskCount >= 10,
      date: today
    },

    {
      achievementKey: "high_roller",
      title: "High Roller",
      description: "Complete 3 high-priority tasks today",
      icon: "⚡",
      progress: dailyHighPriority,
      target: 3,
      unlocked: dailyHighPriority >= 3,
      date: today
    },

    {
      achievementKey: "polymath",
      title: "Polymath",
      description: "Complete tasks in 3 categories today",
      icon: "🧠",
      progress: dailyCategories.size,
      target: 3,
      unlocked: dailyCategories.size >= 3,
      date: today
    },

    {
      achievementKey: "consistent",
      title: "Consistent",
      description: `${currentStreak}-day current streak`,
      icon: "📅",
      progress: consistencyProgress,
      target: 3,
      unlocked: currentStreak >= 3,
      currentStreak,
      milestonesEarned: consistencyMilestones,
      milestones: consistencyMilestonesList
    }

  ];
}


// ----------------------------------------
// REFRESH ALL 25 ACHIEVEMENTS
// ----------------------------------------

async function refreshLifetimeAchievements(browserId) {
  const stats = await calculateLifetimeStats(browserId);

  // Fetch existing achievements in one query.
  const existingAchievements = await LifetimeAchievement.find({
    browserId
  }).lean();

  const existingMap = new Map(
    existingAchievements.map(item => [
      item.achievementKey,
      item
    ])
  );

  const priorityKeys = [
    "priority_starter",
    "priority_champion",
    "high_impact_hero"
  ];

  // Prepare all 25 updates.
  const operations = ACHIEVEMENTS.map(achievement => {
    const progress = achievement.getProgress(stats);

    const existing = existingMap.get(
      achievement.achievementKey
    );

    const isPriorityAchievement = priorityKeys.includes(
      achievement.achievementKey
    );

    const unlocked = isPriorityAchievement
      ? progress >= achievement.target
      : Boolean(existing?.unlocked) ||
        progress >= achievement.target;

    const earnedAt = unlocked
      ? getAchievementUnlockDate(
          achievement,
          stats.completions
        )
      : null;

    const unlockedAt = unlocked
      ? earnedAt || existing?.unlockedAt || null
      : null;

    return {
      updateOne: {
        filter: {
          browserId,
          achievementKey: achievement.achievementKey
        },
        update: {
          $set: {
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            progress,
            target: achievement.target,
            unlocked,
            unlockedAt
          }
        },
        upsert: true
      }
    };
  });

  // Update all achievements together.
  await LifetimeAchievement.bulkWrite(operations, {
    ordered: false
  });

  // Remove retired achievement records.
  const activeKeys = ACHIEVEMENTS.map(
    item => item.achievementKey
  );

  await LifetimeAchievement.deleteMany({
    browserId,
    achievementKey: {
      $nin: activeKeys
    }
  });

  return LifetimeAchievement.find({
    browserId
  })
    .sort({ createdAt: 1 })
    .lean();
}

// ----------------------------------------
// RECORD A TASK COMPLETION
// ----------------------------------------

async function recordTaskCompletion(browserId, task) {
  if (!browserId || !task || !task._id) {
    throw new Error("Browser ID and task ID are required.");
  }

  await initializeLifetimeTaskHistory(browserId);

  const completedAt = task.completedAt
    ? new Date(task.completedAt)
    : new Date();

  const completionDate = getISTDate(completedAt);
  const dueDate = String(task.dueDate || "").slice(0, 10);

  const onTime =
    Boolean(dueDate) && completionDate <= dueDate;

  try {
    await LifetimeTaskCompletion.updateOne(
      {
        browserId,
        taskId: String(task._id)
      },
      {
        $setOnInsert: {
          browserId,
          taskId: String(task._id),
          priority: task.priority || "Medium",
          category: task.category || "Study",
          dueDate,
          completedAt,
          completionDate,
          onTime
        }
      },
      {
        upsert: true
      }
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
  }

  return refreshLifetimeAchievements(browserId);
}

// ----------------------------------------
// EXPORTS
// ----------------------------------------

module.exports = {
  recordTaskCompletion,
  refreshLifetimeAchievements,
  initializeLifetimeTaskHistory,
  getRegularAchievements
};