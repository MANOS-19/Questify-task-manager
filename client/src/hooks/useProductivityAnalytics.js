import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_BASE.endsWith("/api/tasks")
  ? API_BASE
  : API_BASE.endsWith("/api")
    ? `${API_BASE}/tasks`
    : `${API_BASE}/api/tasks`;

const TOKEN_KEY = "questify-token";

// -----------------------------------
// READ ACCOUNT-SPECIFIC CACHE
// -----------------------------------

function readCache(accountId) {
  try {
    if (!accountId) return null;

    const cached = localStorage.getItem(
      `questify-analytics-user-${accountId}`
    );

    return cached ? JSON.parse(cached) : null;

  } catch (error) {
    console.error("Analytics cache error:", error);
    return null;
  }
}

// -----------------------------------
// PRODUCTIVITY ANALYTICS HOOK
// -----------------------------------

export function useProductivityAnalytics(tasks = []) {
  const {
    token,
    user,
    loading: authLoading
  } = useAuth();

  const accountId = user?._id || user?.id;

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -----------------------------------
  // FETCH ACCOUNT ANALYTICS
  // -----------------------------------

  useEffect(() => {
    let cancelled = false;

    const controller = new AbortController();

    async function fetchAnalytics() {

      // Wait until authentication verification finishes.
      if (authLoading) {
        setLoading(true);
        return;
      }

      // No authenticated account.
      if (!token) {
        setAnalytics(null);
        setError("Please log in to view productivity analytics.");
        setLoading(false);
        return;
      }

      // Clear analytics belonging to the previous account.
      setAnalytics(null);
      setError("");
      setLoading(true);

      try {
        // Load only this account's cached analytics.
        const cachedData = readCache(accountId);

        if (!cancelled && cachedData) {
          setAnalytics(cachedData);
        }

        const response = await fetch(
          `${API_URL}/analytics`,
          {
            signal: controller.signal,
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        // Ignore outdated requests or changed sessions.
        if (
          cancelled ||
          localStorage.getItem(TOKEN_KEY) !== token
        ) {
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to load analytics."
          );
        }

        // Update current account analytics.
        setAnalytics(data);
        setError("");

        // Save analytics under the current account ID.
        if (accountId) {
          localStorage.setItem(
            `questify-analytics-user-${accountId}`,
            JSON.stringify(data)
          );
        }

      } catch (error) {
        if (error.name === "AbortError") return;

        console.error(
          "Analytics loading error:",
          error
        );

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

  }, [tasks, token, accountId, authLoading]);

  // -----------------------------------
  // RETURN ANALYTICS
  // -----------------------------------

  return {
    analytics,
    loading,
    error
  };
}