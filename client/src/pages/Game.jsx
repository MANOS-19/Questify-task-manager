import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const DAILY_API = `${API_BASE}/api/game/daily`;
const ANSWER_API = `${API_BASE}/api/game/answer`;
const PROGRESS_API = `${API_BASE}/api/game/progress`;
const RESET_API = `${API_BASE}/api/game/dev-reset`;

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

  const [totalXP, setTotalXP] = useState(() =>
    Number(localStorage.getItem("questify_xp") || 0)
  );

  const [earnedXP, setEarnedXP] = useState(0);
  const [xpAlreadyClaimed, setXpAlreadyClaimed] = useState(false);

  const [playerId] = useState(() => getPlayerId());

// Fetch today's challenge and player progress simultaneously
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

      // Restore score
      setScore(progressData.score);

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

        const completedKey =
          `questify_completed_${challengeData.date}`;

        const currentXP = Number(
          localStorage.getItem("questify_xp") || 0
        );

        if (localStorage.getItem(completedKey)) {
          setXpAlreadyClaimed(true);
          setEarnedXP(0);
          setTotalXP(currentXP);
        } else {
          const updatedXP = currentXP + progressData.score;

          localStorage.setItem(
            "questify_xp",
            String(updatedXP)
          );

          localStorage.setItem(completedKey, "true");

          setXpAlreadyClaimed(false);
          setEarnedXP(progressData.score);
          setTotalXP(updatedXP);
        }
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

  const playerLevel = Math.floor(totalXP / 500) + 1;
  const xpProgress = totalXP % 500;

  // Award XP once per daily challenge
  function completeChallenge() {
    const completedKey = `questify_completed_${challengeDate}`;
    const currentXP = Number(localStorage.getItem("questify_xp") || 0);

    if (localStorage.getItem(completedKey)) {
      setXpAlreadyClaimed(true);
      setEarnedXP(0);
      setTotalXP(currentXP);
      return;
    }

    const updatedXP = currentXP + score;

    localStorage.setItem("questify_xp", String(updatedXP));
    localStorage.setItem(completedKey, "true");

    setXpAlreadyClaimed(false);
    setEarnedXP(score);
    setTotalXP(updatedXP);
  }

  // Submit answer to backend
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
           playerId: playerId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to check your answer.");
      }

      setFeedback({
        correct: data.correct,
        answer: data.correctAnswer
      });

      setScore(data.score);

    } catch (err) {
      setSelected("");
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  function nextPuzzle() {
    if (current === puzzles.length - 1) {
      completeChallenge();
      setFinished(true);
    } else {
      setCurrent(previous => previous + 1);
      setSelected("");
      setFeedback(null);
      setShowHint(false);
      setError("");
    }
  }


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
      throw new Error(data.message || "Unable to reset challenge.");
    }

    window.location.reload();

  } catch (err) {
    alert(err.message);
  }
}


  // Loading screen
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

  // Error screen
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

      {/* Introduction */}
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

        /* Results */
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
              {xpAlreadyClaimed
                ? "⭐ XP already claimed today"
                : `⭐ +${earnedXP} XP Earned`}
            </h2>

            <h3>🏆 Level {playerLevel}</h3>

            <p>{totalXP} Total XP</p>

            <div className="game-progress">
              <div
                style={{
                  width: `${(xpProgress / 500) * 100}%`
                }}
              />
            </div>

            <small>{xpProgress} / 500 XP to next level</small>
          </div>

          <p className="game-feedback">
  🎯 You've completed today's challenge. Come back tomorrow for 10 new puzzles!
</p>

          <button onClick={() => navigate("/")}>
            Dashboard
          </button>
        </div>

      ) : (

        /* Active Game */
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
                    : ""
                }
              >
                {option}

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