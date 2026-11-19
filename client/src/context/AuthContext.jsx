import {
  createContext,
  useContext,
  useState,
  useEffect
} from "react";

const AuthContext = createContext(null);

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "questify-token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY)
  );

  const [loading, setLoading] = useState(true);

  // ==========================================
  // VERIFY AUTHENTICATED USER
  // ==========================================

  useEffect(() => {
    let active = true;

    const verifyUser = async () => {
      setLoading(true);

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/auth/me`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!active) return;

        if (
          response.ok &&
          data.success &&
          data.user
        ) {
          setUser(data.user);

        } else if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem(TOKEN_KEY);

          setToken(null);
          setUser(null);

        } else {
          setUser(null);

          console.error(
            "Unable to verify user:",
            data.message
          );
        }

      } catch (error) {
        if (active) {
          setUser(null);

          console.error(
            "Authentication verification failed:",
            error
          );
        }

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    verifyUser();

    return () => {
      active = false;
    };

  }, [token]);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = async (email, password) => {
    const response = await fetch(
      `${API_BASE}/api/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.token ||
      !data.user
    ) {
      throw new Error(
        data.message || "Login failed"
      );
    }

    localStorage.setItem(
      TOKEN_KEY,
      data.token
    );

    setUser(data.user);
    setToken(data.token);

    return data;
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const register = async (name, email, password) => {
    const response = await fetch(
      `${API_BASE}/api/auth/register`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          name,
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.success ||
      !data.token ||
      !data.user
    ) {
      throw new Error(
        data.message || "Registration failed"
      );
    }

    localStorage.setItem(
      TOKEN_KEY,
      data.token
    );

    setUser(data.user);
    setToken(data.token);

    return data;
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setUser(null);
    setLoading(false);
  };

  // ==========================================
  // CONTEXT PROVIDER
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// CUSTOM AUTH HOOK
// ==========================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
};
