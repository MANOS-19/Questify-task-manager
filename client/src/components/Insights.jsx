import { useMemo } from "react";
import { computeProgress } from "../lib/gamification";

function Insights({ tasks }) {
  const p = useMemo(() => computeProgress(tasks), [tasks]);
  const max = Math.max(1, ...p.week.map((d) => d.count));
  const unlocked = p.badges.filter((b) => b.ok).length;

  return (
    <section className="insights" aria-label="Progress insights">
      <div className="level-card">
        <div className="level-badge" aria-hidden="true">{p.level}</div>
        <div className="level-body">
          <span className="eyebrow">Level {p.level} Achiever</span>
          <h3>{p.xp} XP earned</h3>
          <div className="xp-track" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="xp-fill" style={{ width: `${p.pct}%` }} />
          </div>
          <small>{p.rest} / {p.needed} XP to Level {p.level + 1}</small>
        </div>
        <div className="streak-pill">🔥 {p.streak}-day streak</div>
      </div>

      <div className="insight-grid">
        <div className="glass-card">
          <h3>Weekly Activity</h3>
          <div className="week-chart">
            {p.week.map((d) => (
              <div className="week-col" key={d.label}>
                <span className="week-count">{d.count}</span>
                <div className="week-bar" style={{ height: `${(d.count / max) * 100}%` }} />
                <span className="week-label">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3>Focus Areas</h3>
          {Object.keys(p.cats).length === 0 ? (
            <span className="muted">Add tasks to see your breakdown.</span>
          ) : (
            Object.entries(p.cats).map(([name, c]) => (
              <div className="cat-row" key={name}>
                <span>{name}</span>
                <div className="cat-track">
                  <div className="cat-fill" style={{ width: `${(c.done / c.total) * 100}%` }} />
                </div>
                <span className="muted">{c.done}/{c.total}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-card">
        <h3>Achievements <span className="muted">{unlocked}/{p.badges.length} unlocked</span></h3>
        <div className="badge-grid">
          {p.badges.map((b) => (
            <div className={`badge ${b.ok ? "unlocked" : ""}`} key={b.name} title={b.desc}>
              <span className="badge-icon">{b.icon}</span>
              <strong>{b.name}</strong>
              <span className="muted">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Insights;
