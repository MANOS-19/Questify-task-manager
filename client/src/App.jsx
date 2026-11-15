import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import DashBoard from "./pages/DashBoard";
import Game from "./pages/Game";
import PopupNotifications from "./components/PopupNotifications";

import "./App.css";
import "./premium.css";

function App() {
  return (
    <BrowserRouter>

      {/* Global popup system */}
      <PopupNotifications />

      <Routes>
        <Route path="/" element={<DashBoard />} />
        <Route path="/game" element={<Game />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </BrowserRouter>
  );
}

export default App;