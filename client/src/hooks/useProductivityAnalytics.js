import { useEffect, useState } from "react";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_BASE.endsWith("/api/tasks")
  ? API_BASE
  : API_BASE.endsWith("/api")
    ? `${API_BASE}/tasks`
    : `${API_BASE}/api/tasks`;

function readCache() {
  try {
    const browserId = localStorage.getItem("questify-browser-id");

    if (!browserId) return null;

    const cached = localStorage.getItem(
      `questify-analytics-${browserId}`
    );

    return cached ? JSON.parse(cached) : null;

  } catch (error) {
    console.error("Analytics cache error:", error);
    return null;
  }
}

export function useProductivityAnalytics(tasks = []) {
  const [analytics, setAnalytics] = useState(readCache);

  const [loading, setLoading] = useState(
    () => readCache() === null
  );

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const controller = new AbortController();

    async function fetchAnalytics() {
      try {
        const browserId = localStorage.getItem(
          "questify-browser-id"
        );

        if (!browserId) {
          throw new Error("Browser ID not found.");
        }

        const response = await fetch(
          `${API_URL}/analytics/${encodeURIComponent(browserId)}`,
          {
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load analytics."
          );
        }

        if (!cancelled) {
          setAnalytics(data);
          setError("");

          localStorage.setItem(
            `questify-analytics-${browserId}`,
            JSON.stringify(data)
          );
        }

      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Analytics loading error:", error);

        if (!cancelled) {
          setError(error.message);
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      cancelled = true;
      controller.abort();
    };

  }, [tasks]);

  return {
    analytics,
    loading,
    error
  };
}