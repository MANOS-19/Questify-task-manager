import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import DashBoard from "./pages/DashBoard";
import Game from "./pages/Game";
import PopupNotifications from "./components/PopupNotifications";
import Login from "./pages/Login";
import Register from "./pages/Register";

import { AuthProvider, useAuth } from "./context/AuthContext";

import "./App.css";
import "./premium.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <>
      <PopupNotifications />

      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashBoard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;