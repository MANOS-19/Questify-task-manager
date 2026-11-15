import { useEffect, useRef, useState } from "react";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_BASE.endsWith("/api/tasks")
  ? API_BASE
  : API_BASE.endsWith("/api")
    ? `${API_BASE}/tasks`
    : `${API_BASE}/api/tasks`;

// ----------------------------------------
// LIFETIME ACHIEVEMENT CATEGORIES
// ----------------------------------------

const ACHIEVEMENT_GROUPS = [
  {
    title: "🎯 Task Completion Milestones",
    keys: [
      "momentum_builder",
      "productivity_pro",
      "task_legend",
      "quest_champion",
      "task_titan",
      "elite_performer",
      "ultimate_achiever",
      "unstoppable_achiever"
    ]
  },
  {
    title: "🔥 Streak Milestones",
    keys: [
      "three_day_starter",
      "week_warrior",
      "fortnight_focus",
      "monthly_master",
      "half_century_hero",
      "century_legend"
    ]
  },
  {
    title: "⚡ Priority Achievements",
    keys: [
      "priority_starter",
      "priority_champion",
      "high_impact_hero"
    ]
  },
  {
    title: "🌈 Category Achievements",
    keys: [
      "category_explorer",
      "well_rounded",
      "category_master",
      "all_rounder"
    ]
  },
  {
    title: "📅 Deadline Achievements",
    keys: [
      "on_time_starter",
      "deadline_hero",
      "deadline_dominator",
      "early_planner"
    ]
  }
];

// ----------------------------------------
// CACHE HELPERS
// ----------------------------------------

function readAchievementsCache(prefix) {
  const browserId = localStorage.getItem("questify-browser-id");

  if (!browserId) return null;

  try {
    const cached = localStorage.getItem(
      `${prefix}-${browserId}`
    );

    return cached ? JSON.parse(cached) : null;

  } catch (error) {
    console.error("Achievement cache error:", error);
    return null;
  }
}

// ----------------------------------------
// ACHIEVEMENT CARD
// ----------------------------------------

function AchievementCard({ achievement }) {
  const target = Number(achievement.target) || 1;
  const progress = Number(achievement.progress) || 0;

  const percentage = Math.min(
    (progress / target) * 100,
    100
  );

  const unlocked = Boolean(achievement.unlocked);

  return (
    <div
      className={`achievement-card ${
        unlocked ? "unlocked" : "locked"
      }`}
      key={achievement.achievementKey}
    >
      <div className="achievement-icon">
        {achievement.icon || "🏅"}
      </div>

      <h3>{achievement.title}</h3>

      <p>{achievement.description}</p>

      <div className="achievement-progress">
        <div
          className="achievement-progress-fill"
          style={{
            width: `${percentage}%`
          }}
        />
      </div>

      <div className="achievement-footer">
        <span>
          {Math.min(progress, target)}/{target}
        </span>

        <span>
          {unlocked ? "✓ Unlocked" : "🔒 Locked"}
        </span>
      </div>

      {unlocked && achievement.unlockedAt && (
        <small className="achievement-unlock-date">
          Unlocked on{" "}
          {new Date(
            achievement.unlockedAt
          ).toLocaleDateString("en-IN")}
        </small>
      )}
    </div>
  );
}

// ----------------------------------------
// MAIN ACHIEVEMENTS COMPONENT
// ----------------------------------------

function Achievements({ tasks = [] }) {

  // REGULAR ACHIEVEMENTS

  const [regularAchievements, setRegularAchievements] =
    useState(
      () => readAchievementsCache("questify-regular") || []
    );

  const [regularLoading, setRegularLoading] =
    useState(
      () => !readAchievementsCache("questify-regular")
    );

  const [regularError, setRegularError] = useState("");

  // LIFETIME ACHIEVEMENTS

  const [lifetimeAchievements, setLifetimeAchievements] =
    useState(
      () => readAchievementsCache("questify-lifetime") || []
    );

  const [lifetimeLoading, setLifetimeLoading] =
    useState(
      () => !readAchievementsCache("questify-lifetime")
    );

  const [lifetimeError, setLifetimeError] = useState("");

  // Track previously unlocked lifetime achievements.

  const previousUnlockedRef = useRef(null);

  // ----------------------------------------
  // FETCH REGULAR ACHIEVEMENTS
  // ----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchRegularAchievements() {
      try {
        setRegularError("");

        const browserId = localStorage.getItem(
          "questify-browser-id"
        );

        if (!browserId) {
          throw new Error("Browser ID not found.");
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
          const fetchedAchievements = data.achievements || [];

          localStorage.setItem(
            `questify-regular-${browserId}`,
            JSON.stringify(fetchedAchievements)
          );

          setRegularAchievements(fetchedAchievements);
        }

      } catch (error) {
        console.error(
          "Regular achievements error:",
          error
        );

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
  // FETCH LIFETIME ACHIEVEMENTS
  // ----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchLifetimeAchievements() {
      try {
        setLifetimeError("");

        const browserId = localStorage.getItem(
          "questify-browser-id"
        );

        if (!browserId) {
          throw new Error("Browser ID not found.");
        }

        const cached = readAchievementsCache(
          "questify-lifetime"
        );

        // Initialize popup comparison using cached data.
        if (
          previousUnlockedRef.current === null &&
          cached !== null
        ) {
          previousUnlockedRef.current = new Set(
            cached
              .filter(item => item.unlocked)
              .map(item => item.achievementKey)
          );
        }

        const response = await fetch(
          `${API_URL}/lifetime-achievements/${encodeURIComponent(browserId)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load lifetime achievements."
          );
        }

        if (!cancelled) {
          const fetchedAchievements = data.achievements || [];

          // Save latest data.
          localStorage.setItem(
            `questify-lifetime-${browserId}`,
            JSON.stringify(fetchedAchievements)
          );

          // Detect newly unlocked achievements.
          const currentUnlocked = new Set(
            fetchedAchievements
              .filter(item => item.unlocked)
              .map(item => item.achievementKey)
          );

          if (previousUnlockedRef.current !== null) {

            fetchedAchievements.forEach(achievement => {

              const wasUnlocked =
                previousUnlockedRef.current.has(
                  achievement.achievementKey
                );

              if (
                achievement.unlocked &&
                !wasUnlocked
              ) {
                window.dispatchEvent(
                  new CustomEvent("questify:popup", {
                    detail: {
                      type: "achievement",
                      title: "Achievement Unlocked!",
                      message: achievement.title,
                      icon: achievement.icon || "🏆"
                    }
                  })
                );
              }

            });

          }

          previousUnlockedRef.current = currentUnlocked;

          setLifetimeAchievements(fetchedAchievements);
        }

      } catch (error) {
        console.error(
          "Lifetime achievements error:",
          error
        );

        if (!cancelled) {
          setLifetimeError(error.message);
        }

      } finally {
        if (!cancelled) {
          setLifetimeLoading(false);
        }
      }
    }

    fetchLifetimeAchievements();

    return () => {
      cancelled = true;
    };

  }, [tasks]);

  // ----------------------------------------
  // ACHIEVEMENT COUNTS
  // ----------------------------------------

  const unlockedCount = regularAchievements.filter(
    achievement => achievement.unlocked
  ).length;

  const lifetimeUnlockedCount =
    lifetimeAchievements.filter(
      achievement => achievement.unlocked
    ).length;

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  return (

    <section className="achievements-page">

      <header className="achievements-header">
        <h1>🏆 Achievements</h1>

        <p>
          Complete quests, unlock badges and track your progress.
        </p>
      </header>

      {/* REGULAR ACHIEVEMENTS */}

      <div className="achievement-summary">

        <h2>
          {unlockedCount} / 6
        </h2>

        <p>Achievements Unlocked</p>

      </div>

      {regularLoading && regularAchievements.length === 0 ? (

        <p>Loading achievements...</p>

      ) : regularError && regularAchievements.length === 0 ? (

        <p>{regularError}</p>

      ) : (

        <div className="achievements-grid">

          {regularAchievements.map(achievement => (

            <AchievementCard
              key={achievement.achievementKey}
              achievement={achievement}
            />

          ))}

        </div>

      )}

      {/* LIFETIME ACHIEVEMENTS */}

      <div className="lifetime-achievements-section">

        <div className="achievements-header">
          <h2>🏅 Lifetime Achievements</h2>
        </div>

        {lifetimeLoading &&
        lifetimeAchievements.length === 0 ? (

          <p>Loading lifetime achievements...</p>

        ) : lifetimeError &&
          lifetimeAchievements.length === 0 ? (

          <p>{lifetimeError}</p>

        ) : (

          <>

            {/* LIFETIME SUMMARY */}

            <div className="achievement-summary">

              <h2>
                {lifetimeUnlockedCount} / 25
              </h2>

              <p>Lifetime Achievements Unlocked</p>

            </div>

            {/* GROUPED LIFETIME ACHIEVEMENTS */}

            {ACHIEVEMENT_GROUPS.map(group => {

              const groupAchievements = group.keys
                .map(key =>
                  lifetimeAchievements.find(
                    achievement =>
                      achievement.achievementKey === key
                  )
                )
                .filter(Boolean);

              if (groupAchievements.length === 0) {
                return null;
              }

              return (

                <div
                  className="lifetime-achievement-group"
                  key={group.title}
                >

                  <h3 className="lifetime-achievement-group-title">
                    {group.title}
                  </h3>

                  <div className="achievements-grid">

                    {groupAchievements.map(achievement => (

                      <AchievementCard
                        key={achievement.achievementKey}
                        achievement={achievement}
                      />

                    ))}

                  </div>

                </div>

              );

            })}

          </>

        )}

      </div>

    </section>

  );

}

export default Achievements;