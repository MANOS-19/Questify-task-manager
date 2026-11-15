import { useNavigate, useLocation } from "react-router-dom";

function Sidebar({ activePage, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", icon: "⌂" },
    { name: "Calendar", icon: "▦" },
    { name: "My Tasks", icon: "✓" },
    { name: "Quest Challenge", icon: "🎮", path: "/game" },
    { name: "Analytics", icon: "▥" },
    { name: "Achievements", icon: "🏆" }
  ];

  return (
    <aside className="sidebar">

      <div
    className="sidebar-logo"
    role="button"
    tabIndex={0}
    title="Go to Dashboard"
    onClick={() => window.location.assign("/")}
    onKeyDown={event => {
        if (event.key === "Enter") {
            window.location.assign("/");
        }
    }}
>
        <span className="logo-icon">Q</span>
        <h2>Questify</h2>
      </div>

      <p className="sidebar-label">MENU</p>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const isActive = item.path
            ? location.pathname === item.path
            : activePage === item.name;

          return (
            <button
              key={item.name}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                } else {
                  onNavigate(item.name);
                }
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* SETTINGS AT BOTTOM */}
      <button
        className={`sidebar-link sidebar-settings ${
          activePage === "Settings" ? "active" : ""
        }`}
        onClick={() => onNavigate("Settings")}
      >
        <span className="sidebar-icon">⚙</span>
        <span>Settings</span>
      </button>

    </aside>
  );
}

export default Sidebar;