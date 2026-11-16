import { useMemo } from "react";
import { computeProgress } from "../lib/gamification";
import { useProductivityAnalytics } from "../hooks/useProductivityAnalytics";


function Analytics({ tasks = [] }) {

  const localProgress = useMemo(
    () => computeProgress(tasks),
    [tasks]
  );

  const { analytics, loading, error } =
    useProductivityAnalytics(tasks);

  const p = {
    ...localProgress,
    ...(analytics?.productivity || {}),
    cats: analytics?.taskStats?.categories || localProgress.cats,
    week: analytics?.week || localProgress.week
  };

  const taskStats = analytics?.taskStats;

  // Permanent historical statistics
const historyStats = analytics?.historyStats;

const historicalCategories =
  historyStats?.categories || [];

const historicalPriorities =
  historyStats?.priorities || [];

 
// Current task statistics
const total = tasks.length;

const completed = tasks.filter(
  task => task.completed
).length;

const pending = total - completed;

const completionRate = total
  ? Math.round((completed / total) * 100)
  : 0;


  const maxWeek = Math.max(1, ...p.week.map(day => day.count));

  return (
    <section className="analytics-page">

      <header className="analytics-header">
        <h1>▥ Analytics</h1>
        <p>Understand your productivity and track your performance.</p>
      </header>

      {/* OVERVIEW */}
      <div className="analytics-stats">
        <div className="analytics-stat">
          <span>Total Tasks</span>
          <h2>{total}</h2>
        </div>

        <div className="analytics-stat">
          <span>Completed</span>
          <h2>{completed}</h2>
        </div>

        <div className="analytics-stat">
          <span>Pending</span>
          <h2>{pending}</h2>
        </div>

        <div className="analytics-stat">
          <span>Completion Rate</span>
          <h2>{completionRate}%</h2>
        </div>
      </div>

      {/* WEEKLY ACTIVITY */}
      <div className="analytics-card">
        <h2>Weekly Activity</h2>
        <p>Tasks completed during the last seven days.</p>

        <div className="week-chart">
          {p.week.map(day => (
            <div className="week-col" key={day.label}>
              <span className="week-count">{day.count}</span>

              <div
                className="week-bar"
                style={{
                  height: `${(day.count / maxWeek) * 150}px`
                }}
              />

              <span className="week-label">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

    {/* CATEGORY PERFORMANCE */}

<div className="analytics-card">

  <h2>Completed Tasks by Category</h2>

  {historicalCategories.length === 0 ? (

    <p>No completed task history available yet.</p>

  ) : (

    historicalCategories.map(category => (

      <div
        className="analytics-breakdown"
        key={category.name}
      >

        <div className="analytics-breakdown-heading">

          <span>{category.name}</span>

          <span>
            {category.count} completed
          </span>

        </div>

        <div className="analytics-track">

          <div
            className="analytics-fill"
            style={{
              width: `${category.percentage}%`
            }}
          />

        </div>

      </div>

    ))

  )}

</div>

     {/* PRIORITY BREAKDOWN */}

<div className="analytics-card">

  <h2>Completed Tasks by Priority</h2>

  {historicalPriorities.map(priority => (

    <div
      className="analytics-breakdown"
      key={priority.name}
    >

      <div className="analytics-breakdown-heading">

        <span>{priority.name} Priority</span>

        <span>
          {priority.count} completed
        </span>

      </div>

      <div className="analytics-track">

        <div
          className="analytics-fill"
          style={{
            width: `${priority.percentage}%`
          }}
        />

      </div>

    </div>

  ))}

</div>

      {/* PRODUCTIVITY SUMMARY */}
      <div className="analytics-card">
        <h2>Productivity Summary</h2>

        <div className="analytics-summary">
          <div>
            <span>⭐ Experience</span>
            <h3>{p.xp} XP</h3>
          </div>

          <div>
            <span>🏆 Current Level</span>
            <h3>Level {p.level}</h3>
          </div>

          <div>
            <span>🔥 Daily Streak</span>
            <h3>{p.streak} Days</h3>
          </div>
        </div>
      </div>

    </section>
  );
}

export default Analytics;