import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const DAILY_API = `${API_BASE}/api/game/daily`;
const ANSWER_API = `${API_BASE}/api/game/answer`;
const PROGRESS_API = `${API_BASE}/api/game/progress`;
const RESET_API = `${API_BASE}/api/game/dev-reset`;
const ANALYTICS_API = `${API_BASE}/api/tasks/analytics`;

function shuffle(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getPlayerId() {
  let playerId = localStorage.getItem("questify_player_id");

  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem("questify_player_id", playerId);
  }

  return playerId;
}

function getBrowserId() {
  let browserId = localStorage.getItem("questify-browser-id");

  if (!browserId) {
    browserId = crypto.randomUUID();
    localStorage.setItem("questify-browser-id", browserId);
  }

  return browserId;
}

function prepareQuestions(questions) {
  return questions.map(question => ({
    id: question.id,
    emojis: question.question,
    hint: question.hint,
    options: shuffle(question.options)
  }));
}

function isValidChallenge(data) {
  return (
    data &&
    Array.isArray(data.questions) &&
    data.questions.length === 10 &&
    data.questions.every(
      q =>
        q.id &&
        q.question &&
        q.hint &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        new Set(q.options).size === 4
    )
  );
}

export default function Game() {
  const navigate = useNavigate();

  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [challengeDate, setChallengeDate] = useState("");
  const [generatedBy, setGeneratedBy] = useState("");

  // Permanent XP from MongoDB
  const [totalXP, setTotalXP] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xpProgress, setXpProgress] = useState(0);
  const [neededXP, setNeededXP] = useState(100);

  // XP earned from today's puzzle answers
  const [earnedXP, setEarnedXP] = useState(0);

  const [playerId] = useState(() => getPlayerId());
  const [browserId] = useState(() => getBrowserId());

  // -----------------------------------
  // FETCH PERMANENT XP FROM BACKEND
  // -----------------------------------

  async function fetchPermanentXP() {
    try {
      const response = await fetch(
        `${ANALYTICS_API}/${encodeURIComponent(browserId)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to fetch permanent XP."
        );
      }

      const progress = data.productivity;

      setTotalXP(progress.xp);
      setPlayerLevel(progress.level);
      setXpProgress(progress.rest);
      setNeededXP(progress.needed);

    } catch (error) {
      console.error("Permanent XP error:", error);
    }
  }

  // Fetch XP when Game page opens
  useEffect(() => {
    fetchPermanentXP();
  }, [browserId]);

  // -----------------------------------
  // FETCH DAILY CHALLENGE AND PROGRESS
  // -----------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchDailyChallenge() {
      try {
        setLoading(true);
        setError("");

        const [challengeResponse, progressResponse] =
          await Promise.all([
            fetch(DAILY_API, { cache: "no-store" }),

            fetch(
              `${PROGRESS_API}?playerId=${encodeURIComponent(playerId)}`,
              { cache: "no-store" }
            )
          ]);

        if (!challengeResponse.ok) {
          throw new Error("Unable to load today's challenge.");
        }

        if (!progressResponse.ok) {
          throw new Error("Unable to load your game progress.");
        }

        const [challengeData, progressData] = await Promise.all([
          challengeResponse.json(),
          progressResponse.json()
        ]);

        if (!isValidChallenge(challengeData)) {
          throw new Error("Invalid daily challenge data.");
        }

        if (!progressData.success) {
          throw new Error("Unable to restore your game progress.");
        }

        if (cancelled) return;

        setChallengeDate(challengeData.date);
        setGeneratedBy(challengeData.generatedBy);
        setPuzzles(prepareQuestions(challengeData.questions));

        // Restore daily game score
        setScore(progressData.score);

        // Restore XP earned from correct answers today
        const correctAnswers = (
          progressData.answered || []
        ).filter(answer => answer.correct).length;

        setEarnedXP(correctAnswers * 10);

        // Restore current question
        const answeredCount = progressData.answered.length;

        if (answeredCount > 0) {
          setStarted(true);
          setCurrent(answeredCount);
        }

        // Restore completed challenge
        if (progressData.completed) {
          setStarted(true);
          setFinished(true);
        }

      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDailyChallenge();

    return () => {
      cancelled = true;
    };

  }, [playerId]);

  const puzzle = puzzles[current];

  // -----------------------------------
  // SUBMIT ANSWER
  // -----------------------------------

  async function selectAnswer(option) {
    if (selected || checking || !puzzle) return;

    setSelected(option);
    setChecking(true);
    setError("");

    try {
      const response = await fetch(ANSWER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: challengeDate,
          questionId: puzzle.id,
          selectedAnswer: option,
          playerId: playerId,
          browserId: browserId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to check your answer."
        );
      }

      setFeedback({
        correct: data.correct,
        answer: data.correctAnswer
      });

      setScore(data.score);

      // Update today's puzzle XP display
      if (data.correct) {
        setEarnedXP(previous => previous + 10);
      }

      // Refresh permanent XP from MongoDB
      await fetchPermanentXP();

    } catch (err) {
      setSelected("");
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  // -----------------------------------
  // NEXT PUZZLE
  // -----------------------------------

  function nextPuzzle() {
    if (current === puzzles.length - 1) {
      setFinished(true);
      fetchPermanentXP();
    } else {
      setCurrent(previous => previous + 1);
      setSelected("");
      setFeedback(null);
      setShowHint(false);
      setError("");
    }
  }

  // -----------------------------------
  // DEV RESET
  // -----------------------------------

  async function resetDailyChallenge() {
    const confirmReset = window.confirm(
      "Reset your daily challenge? You can play again."
    );

    if (!confirmReset) return;

    try {
      const response = await fetch(
        `${RESET_API}/${encodeURIComponent(playerId)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to reset challenge."
        );
      }

      window.location.reload();

    } catch (err) {
      alert(err.message);
    }
  }

  // -----------------------------------
  // LOADING SCREEN
  // -----------------------------------

  if (loading) {
    return (
      <div className="game-page">
        <div className="game-result">
          <div className="result-icon">🧩</div>
          <h1>Preparing Your Daily Challenge...</h1>
          <p>Loading today's puzzles!</p>
        </div>
      </div>
    );
  }

  // -----------------------------------
  // ERROR SCREEN
  // -----------------------------------

  if (error && !puzzles.length) {
    return (
      <div className="game-page">
        <div className="game-result">
          <div className="result-icon">😕</div>
          <h1>Challenge Unavailable</h1>
          <p>{error}</p>

          <button onClick={() => window.location.reload()}>
            Try Again 🔄
          </button>

          <button onClick={() => navigate("/")}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">

      {import.meta.env.DEV && (
        <button
          onClick={resetDailyChallenge}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "#dc2626",
            color: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer"
          }}
        >
          🔄 Dev Reset
        </button>
      )}

      <button
        className="game-back"
        onClick={() => navigate("/")}
      >
        ← Back to Dashboard
      </button>

      {/* INTRODUCTION */}

      {!started ? (

        <div className="game-result">
          <div className="result-icon">🧩</div>

          <span className="game-tag">
            ✨ {generatedBy || "Questify"} · DAILY CHALLENGE
          </span>

          <p>📅 Challenge Date: {challengeDate}</p>

          <h1>Emoji Brain Challenge</h1>

          <p>
            Your daily challenge is ready!
            Decode the emojis and guess the hidden words.
          </p>

          <h3>🎯 10 Puzzles · ⭐ 10 Points Each</h3>

          <h3>🏆 Current Level: {playerLevel}</h3>

          <p>⭐ Total XP: {totalXP}</p>

          <button onClick={() => setStarted(true)}>
            Let's Play! 🚀
          </button>
        </div>

      ) : finished ? (

        /* RESULTS */

        <div className="game-result">
          <div className="result-icon">🏆</div>

          <h1>Challenge Completed!</h1>

          <h2>{score} / 100 Points</h2>

          <p>
            {score === 100
              ? "Amazing! You're an emoji master! 🎉"
              : score >= 70
                ? "Fantastic effort! Keep going! 🚀"
                : "Great effort! Keep training your brain! 🧠"}
          </p>

          <div className="xp-summary">

            <h2>
              ⭐ +{earnedXP} XP Earned Today
            </h2>

            <h3>🏆 Level {playerLevel}</h3>

            <p>{totalXP} Total XP</p>

            <div className="game-progress">
              <div
                style={{
                  width: `${
                    neededXP > 0
                      ? (xpProgress / neededXP) * 100
                      : 0
                  }%`
                }}
              />
            </div>

            <small>
              {xpProgress} / {neededXP} XP to next level
            </small>

          </div>

          <p className="game-feedback">
            🎯 You've completed today's challenge.
            Come back tomorrow for 10 new puzzles!
          </p>

          <button onClick={() => navigate("/")}>
            Dashboard
          </button>
        </div>

      ) : (

        /* ACTIVE GAME */

        <div className="game-card">

          <div className="game-header">
            <span>🧩 EMOJI CHALLENGE</span>
            <span>⭐ {score} Points</span>
          </div>

          <div className="game-progress">
            <div
              style={{
                width: `${((current + 1) / puzzles.length) * 100}%`
              }}
            />
          </div>

          <div className="game-question-count">
            PUZZLE {current + 1} OF {puzzles.length}
          </div>

          <div className="emoji-puzzle">
            {puzzle.emojis}
          </div>

          <p className="game-instruction">
            Decode these emojis. What word do they represent?
          </p>

          <div className="game-options">
            {puzzle.options.map(option => (
              <button
                key={option}
                onClick={() => selectAnswer(option)}
                disabled={!!selected || checking}
                className={
                  feedback
                    ? feedback.correct && option === selected
                      ? "correct"
                      : !feedback.correct && option === selected
                        ? "incorrect"
                        : ""
                    : selected === option && checking
                      ? "checking"
                      : ""
                }
              >
                {option}

                {selected === option && checking && " ⏳"}

                {feedback &&
                  option === selected &&
                  (feedback.correct ? " ✓" : " ✕")}
              </button>
            ))}
          </div>

          {!selected && (
            <button
              className="hint-button"
              onClick={() => setShowHint(true)}
            >
              💡 {showHint ? puzzle.hint : "Need a hint?"}
            </button>
          )}

          {checking && (
            <p>Checking your answer...</p>
          )}

          {error && (
            <p className="game-feedback">{error}</p>
          )}

          {feedback && (
            <div className="game-feedback">
              {feedback.correct
                ? "🎉 Correct! You earned 10 points!"
                : `❌ Not quite! The answer is ${feedback.answer}.`}
            </div>
          )}

          <div className="game-footer">
            <span>🔥 Keep going!</span>

            <button
              onClick={nextPuzzle}
              disabled={!feedback || checking}
            >
              {current === puzzles.length - 1
                ? "See Results 🏆"
                : "Next Puzzle →"}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}