// Pure functions: progress, XP, streaks and achievements derived from tasks.
export const XP = { Low: 10, Medium: 20, High: 40 };

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Mongoose `updatedAt` is used as the completion time of a finished task.
const doneDay = (t) => (t.updatedAt ? iso(new Date(t.updatedAt)) : null);

export function computeProgress(tasks) {
  const done = tasks.filter((t) => t.completed);
  const xp = done.reduce((sum, t) => sum + (XP[t.priority] || 10), 0);

  // Level n needs n*100 XP to reach level n+1
  let level = 1;
  let rest = xp;
  while (rest >= level * 100) {
    rest -= level * 100;
    level++;
  }

  // Streak: consecutive days (ending today or yesterday) with a completed task
  const days = new Set(done.map(doneDay).filter(Boolean));
  const cursor = new Date();
  if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(iso(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      count: done.filter((t) => doneDay(t) === iso(d)).length,
    };
  });

  const cats = {};
  tasks.forEach((t) => {
    const c = t.category || "Study";
    cats[c] = cats[c] || { total: 0, done: 0 };
    cats[c].total++;
    if (t.completed) cats[c].done++;
  });

  const high = done.filter((t) => t.priority === "High").length;
  const spread = new Set(done.map((t) => t.category || "Study")).size;

  const badges = [
    { icon: "🚀", name: "First Quest", desc: "Complete 1 task", ok: done.length >= 1 },
    { icon: "🔥", name: "On a Roll", desc: "Complete 5 tasks", ok: done.length >= 5 },
    { icon: "🏆", name: "Task Master", desc: "Complete 10 tasks", ok: done.length >= 10 },
    { icon: "⚡", name: "High Roller", desc: "Finish 3 high-priority tasks", ok: high >= 3 },
    { icon: "🧠", name: "Polymath", desc: "Complete tasks in 3 categories", ok: spread >= 3 },
    { icon: "📅", name: "Consistent", desc: "Reach a 3-day streak", ok: streak >= 3 },
  ];

  return { xp, level, rest, needed: level * 100, pct: Math.round((rest / (level * 100)) * 100), streak, week, cats, badges };
}
