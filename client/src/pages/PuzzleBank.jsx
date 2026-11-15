import { useEffect, useState } from "react";

const API_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:5000") +
  "/api/game/bank/stats";

function PuzzleBank() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Failed to fetch puzzle statistics");
        }

        const data = await response.json();
        setStats(data.statistics);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <p>Loading puzzle bank...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="puzzle-bank-page">
      <h1>AI Puzzle Bank</h1>
      <p>Manage your permanently stored AI-generated puzzles.</p>

      <div className="puzzle-stats">
        <div className="stat-card">
          <h3>Total Questions</h3>
          <h2>{stats.total}</h2>
        </div>

        <div className="stat-card">
          <h3>Gemini Generated</h3>
          <h2>{stats.gemini}</h2>
        </div>

        <div className="stat-card">
          <h3>Predefined Questions</h3>
          <h2>{stats.puzzleBank}</h2>
        </div>
      </div>
    </div>
  );
}

export default PuzzleBank;