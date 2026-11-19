import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const DAILY_API = `${API_BASE}/api/game/daily`;
const ANSWER_API = `${API_BASE}/api/game/answer`;
const PROGRESS_API = `${API_BASE}/api/game/progress`;
const ANALYTICS_API = `${API_BASE}/api/tasks/analytics`;

const TOKEN_KEY = "questify-token";

// -----------------------------------
// HELPER FUNCTIONS
// -----------------------------------

function shuffle(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i]
    ];
  }

  return shuffled;
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
      question =>
        question.id &&
        question.question &&
        question.hint &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        new Set(question.options).size === 4
    )
  );
}

// -----------------------------------
// GAME COMPONENT
// -----------------------------------

export default function Game() {
  const navigate = useNavigate();
  const { token } = useAuth();

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

  // -----------------------------------
  // CHECK CURRENT ACCOUNT SESSION
  // -----------------------------------

  function isCurrentSession() {
    return (
      token &&
      localStorage.getItem(TOKEN_KEY) === token
    );
  }

  // -----------------------------------
  // RESET GAME STATE
  // -----------------------------------

  function resetGameState() {
    setPuzzles([]);
    setLoading(true);
    setChecking(false);
    setError("");

    setStarted(false);
    setCurrent(0);
    setSelected("");
    setFeedback(null);
    setScore(0);
    setFinished(false);
    setShowHint(false);

    setChallengeDate("");
    setGeneratedBy("");

    setTotalXP(0);
    setPlayerLevel(1);
    setXpProgress(0);
    setNeededXP(100);
    setEarnedXP(0);
  }

  // -----------------------------------
  // FETCH PERMANENT XP FROM BACKEND
  // -----------------------------------

  async function fetchPermanentXP() {
    if (!token || !isCurrentSession()) return;

    try {
      const response = await fetch(ANALYTICS_API, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!isCurrentSession()) return;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to fetch permanent XP."
        );
      }

      const progress = data.productivity;

      if (!progress) {
        throw new Error("XP information is unavailable.");
      }

      setTotalXP(Number(progress.xp) || 0);
      setPlayerLevel(Number(progress.level) || 1);
      setXpProgress(Number(progress.rest) || 0);
      setNeededXP(Number(progress.needed) || 100);

    } catch (error) {
      console.error("Permanent XP error:", error);
    }
  }

  // -----------------------------------
  // FETCH XP WHEN GAME PAGE OPENS
  // -----------------------------------

  useEffect(() => {
    if (token) {
      fetchPermanentXP();
    }
  }, [token]);

  // -----------------------------------
  // FETCH DAILY CHALLENGE AND ACCOUNT
  // PROGRESS
  // -----------------------------------

  useEffect(() => {
    let cancelled = false;

    // Clear previous account's game information.
    resetGameState();

    if (!token) {
      setLoading(false);
      return;
    }

    async function fetchDailyChallenge() {
      try {
        setLoading(true);
        setError("");

        const [challengeResponse, progressResponse] =
          await Promise.all([
            // Daily challenge content is shared globally.
            fetch(DAILY_API, {
              cache: "no-store"
            }),

            // Individual progress belongs to the logged-in account.
            fetch(PROGRESS_API, {
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${token}`
              }
            })
          ]);

        if (!challengeResponse.ok) {
          throw new Error(
            "Unable to load today's challenge."
          );
        }

        if (!progressResponse.ok) {
          throw new Error(
            "Unable to load your game progress."
          );
        }

        const [challengeData, progressData] =
          await Promise.all([
            challengeResponse.json(),
            progressResponse.json()
          ]);

        // Ignore responses belonging to an old session.
        if (cancelled || !isCurrentSession()) return;

        if (!isValidChallenge(challengeData)) {
          throw new Error(
            "Invalid daily challenge data."
          );
        }

        if (!progressData.success) {
          throw new Error(
            "Unable to restore your game progress."
          );
        }

        const answered = Array.isArray(progressData.answered)
          ? progressData.answered
          : [];

        if (answered.length > challengeData.questions.length) {
          throw new Error(
            "Your saved game progress is inconsistent."
          );
        }

        // Restore shared challenge information.
        setChallengeDate(challengeData.date);
        setGeneratedBy(challengeData.generatedBy);
        setPuzzles(
          prepareQuestions(challengeData.questions)
        );

        // Restore this account's score.
        setScore(Number(progressData.score) || 0);

        // Restore XP earned from correct answers.
        const correctAnswers = answered.filter(
          answer => answer.correct
        ).length;

        setEarnedXP(correctAnswers * 10);

        // Restore account's question progress.
        if (progressData.completed) {
          setStarted(true);
          setFinished(true);
          setCurrent(challengeData.questions.length - 1);

        } else if (answered.length > 0) {
          setStarted(true);
          setCurrent(answered.length);
        }

      } catch (err) {
        if (!cancelled && isCurrentSession()) {
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

  }, [token]);

  // -----------------------------------
  // CURRENT PUZZLE
  // -----------------------------------

  const puzzle = puzzles[current];

  // -----------------------------------
  // SUBMIT ANSWER
  // -----------------------------------

  async function selectAnswer(option) {
    if (
      !token ||
      !isCurrentSession() ||
      selected ||
      checking ||
      !puzzle
    ) {
      return;
    }

    setSelected(option);
    setChecking(true);
    setError("");

    try {
      const response = await fetch(ANSWER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: challengeDate,
          questionId: puzzle.id,
          selectedAnswer: option
        })
      });

      const data = await response.json();

      // Do not update a different account's screen.
      if (!isCurrentSession()) return;

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to check your answer."
        );
      }

      setFeedback({
        correct: data.correct,
        answer: data.correctAnswer
      });

      setScore(Number(data.score) || 0);

      // Update today's puzzle XP display.
      if (data.correct) {
        setEarnedXP(previous => previous + 10);
      }

      // Refresh permanent XP from MongoDB.
      await fetchPermanentXP();

    } catch (err) {
      if (isCurrentSession()) {
        setSelected("");
        setError(err.message);
      }

    } finally {
      if (isCurrentSession()) {
        setChecking(false);
      }
    }
  }

  // -----------------------------------
  // NEXT PUZZLE
  // -----------------------------------

  function nextPuzzle() {
    if (!puzzles.length || !feedback) return;

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
  // LOGIN REQUIRED
  // -----------------------------------

  if (!token) {
    return (
      <div className="game-page">
        <div className="game-result">
          <div className="result-icon">🔐</div>

          <h1>Login Required</h1>

          <p>Please log in to play the daily challenge.</p>

          <button onClick={() => navigate("/")}>
            Dashboard
          </button>
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

  // -----------------------------------
  // MAIN GAME UI
  // -----------------------------------

  return (
    <div className="game-page">

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
                      ? Math.min(
                          (xpProgress / neededXP) * 100,
                          100
                        )
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
                width: `${
                  ((current + 1) / puzzles.length) * 100
                }%`
              }}
            />
          </div>

          <div className="game-question-count">
            PUZZLE {current + 1} OF {puzzles.length}
          </div>

          <div className="emoji-puzzle">
            {puzzle?.emojis}
          </div>

          <p className="game-instruction">
            Decode these emojis. What word do they represent?
          </p>

          <div className="game-options">
            {puzzle?.options.map(option => (
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
              💡 {showHint ? puzzle?.hint : "Need a hint?"}
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