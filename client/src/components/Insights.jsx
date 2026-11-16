import { useMemo, useEffect, useState } from "react";
import { computeProgress } from "../lib/gamification";
import { useProductivityAnalytics } from "../hooks/useProductivityAnalytics";

const TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

// ----------------------------------------
// API URL
// ----------------------------------------

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_BASE.endsWith("/api/tasks")
  ? API_BASE
  : API_BASE.endsWith("/api")
    ? `${API_BASE}/tasks`
    : `${API_BASE}/api/tasks`;

// ----------------------------------------
// GET DATE IN INDIAN STANDARD TIME
// ----------------------------------------

function getISTDateKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find(
    part => part.type === "year"
  ).value;

  const month = parts.find(
    part => part.type === "month"
  ).value;

  const day = parts.find(
    part => part.type === "day"
  ).value;

  return `${year}-${month}-${day}`;
}

// ----------------------------------------
// GENERATE LAST SEVEN DAYS
// ----------------------------------------

function getLastSevenDays() {
  const todayKey = getISTDateKey(new Date());

  const [year, month, day] = todayKey
    .split("-")
    .map(Number);

  const todayUTC = Date.UTC(
    year,
    month - 1,
    day
  );

  return Array.from({ length: 7 }, (_, index) => {

    const timestamp =
      todayUTC - (6 - index) * DAY_MS;

    const date = new Date(timestamp);

    const dateKey = date.toISOString().slice(0, 10);

    const label = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC"
    }).format(date);

    return {
      date: dateKey,
      label,
      count: 0
    };

  });
}

// ----------------------------------------
// INSIGHTS COMPONENT
// ----------------------------------------

function Insights({ tasks }) {
  const [regularAchievements, setRegularAchievements] = useState([]);
const [regularLoading, setRegularLoading] = useState(true);
const [regularError, setRegularError] = useState("");

  const localProgress = useMemo(
    () => computeProgress(tasks),
    [tasks]
  );

  const { analytics, loading, error } =
    useProductivityAnalytics(tasks);

 const analyticsCategories = analytics?.taskStats?.categories;

const hasAnalyticsCategories =
  analyticsCategories &&
  Object.keys(analyticsCategories).length > 0;

const p = {
  ...localProgress,
  ...(analytics?.productivity || {}),
  cats: hasAnalyticsCategories
    ? analyticsCategories
    : localProgress.cats,
  week: analytics?.week || localProgress.week
};

  // ----------------------------------------
// FETCH REGULAR ACHIEVEMENTS
// ----------------------------------------

useEffect(() => {
  let cancelled = false;

  async function fetchRegularAchievements() {
    try {
      setRegularError("");

      let browserId = localStorage.getItem("questify-browser-id");

      if (!browserId) {
        browserId = crypto.randomUUID();

        localStorage.setItem(
          "questify-browser-id",
          browserId
        );
      }

      const response = await fetch(
        `${API_URL}/regular-achievements/${encodeURIComponent(browserId)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load achievements."
        );
      }

      if (!cancelled) {
        setRegularAchievements(data.achievements || []);
      }

    } catch (error) {
      console.error("Dashboard achievements error:", error);

      if (!cancelled) {
        setRegularError(error.message);
      }

    } finally {
      if (!cancelled) {
        setRegularLoading(false);
      }
    }
  }

  fetchRegularAchievements();

  return () => {
    cancelled = true;
  };

}, [tasks]);

  // ----------------------------------------
// SHARED WEEKLY ACTIVITY
// ----------------------------------------

const week = p.week;

  // ----------------------------------------
  // CHART CALCULATIONS
  // ----------------------------------------

  const max = Math.max(
    1,
    ...week.map(day => day.count)
  );

  const unlocked = p.badges.filter(
    badge => badge.ok
  ).length;

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  return (

    <section
      className="insights"
      aria-label="Progress insights"
    >

      {/* LEVEL AND XP */}

      <div className="level-card">

        <div
          className="level-badge"
          aria-hidden="true"
        >
          {p.level}
        </div>

        <div className="level-body">

          <span className="eyebrow">
            Level {p.level} Achiever
          </span>

          <h3>{p.xp} XP earned</h3>

          <div
            className="xp-track"
            role="progressbar"
            aria-valuenow={p.pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="xp-fill"
              style={{
                width: `${p.pct}%`
              }}
            />
          </div>

          <small>
            {p.rest} / {p.needed} XP to Level {p.level + 1}
          </small>

        </div>

        <div className="streak-pill">
          🔥 {p.streak}-day streak
        </div>

      </div>

      {/* WEEKLY ACTIVITY */}

      <div className="insight-grid">

        <div className="glass-card">

          <h3>Weekly Activity</h3>

          {loading && (
            <span className="muted">
              loading activity...
            </span>
          )}

          {error && (
            <span className="muted">
              {error}
            </span>
          )}

          <div className="week-chart">

            {week.map(day => (

              <div
                className="week-col"
                key={day.date}
                title={`${day.count} tasks completed on ${day.date}`}
              >

                <span className="week-count">
                  {day.count}
                </span>

                <div
                  className="week-bar"
                  style={{
                    height: `${(day.count / max) * 100}%`
                  }}
                />

                <span className="week-label">
                  {day.label}
                </span>

              </div>

            ))}

          </div>

        </div>

        {/* FOCUS AREAS */}

        <div className="glass-card">

          <h3>Focus Areas</h3>

          {Object.keys(p.cats).length === 0 ? (

            <span className="muted">
              Add tasks to see your breakdown.
            </span>

          ) : (

            Object.entries(p.cats).map(([name, category]) => (

              <div
                className="cat-row"
                key={name}
              >

                <span>{name}</span>

                <div className="cat-track">

                  <div
                    className="cat-fill"
                    style={{
                      width: `${
                        category.total
                          ? (category.done / category.total) * 100
                          : 0
                      }%`
                    }}
                  />

                </div>

                <span className="muted">
                  {category.done}/{category.total}
                </span>

              </div>

            ))

          )}

        </div>

      </div>

      {/* EXISTING ACHIEVEMENTS */}

     {/* REGULAR ACHIEVEMENTS */}

<div className="glass-card">

  <h3>
    Achievements

    <span className="muted">
      {
        regularAchievements.filter(
          achievement => achievement.unlocked
        ).length
      }/{regularAchievements.length} unlocked
    </span>
  </h3>

  {regularLoading && (
    <span className="muted">
      Loading achievements...
    </span>
  )}

  {regularError && (
    <span className="muted">
      {regularError}
    </span>
  )}

  {!regularLoading && !regularError && (

    <div className="badge-grid">

      {regularAchievements.map(achievement => (

        <div
          className={`badge ${
            achievement.unlocked ? "unlocked" : ""
          }`}
          key={achievement.achievementKey}
          title={achievement.description}
        >

          <span className="badge-icon">
            {achievement.icon}
          </span>

          <strong>
            {achievement.title}
          </strong>

          <span className="muted">
            {achievement.achievementKey === "consistent"
              ? `${achievement.currentStreak}-day streak · ${achievement.progress}/3`
              : achievement.description}
          </span>

        </div>

      ))}

    </div>

  )}

</div>

    </section>

  );

}

export default Insights;