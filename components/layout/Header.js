import { useAuth } from "../../contexts/AuthContext";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/pos":       "Point of Sale",
  "/orders":    "Orders",
  "/kitchen":   "Kitchen Board",
  "/payments":  "Payments",
  "/menu":      "Menu Management",
  "/reports":   "Reports",
  "/users":     "Users",
  "/settings":  "Settings",
};

// Color for each role badge in the header
const ROLE_COLORS = {
  admin:   { background: "#fff0f3", color: "#e94560" },
  manager: { background: "#f0f4ff", color: "#3b5bdb" },
  cashier: { background: "#f0fff4", color: "#2f9e44" },
  kitchen: { background: "#fff8f0", color: "#e67700" },
};

export default function Header({ pathname }) {
  const { user, logout } = useAuth();
  const title            = PAGE_TITLES[pathname] || "Restaurant OS";
  const roleStyle        = ROLE_COLORS[user?.role] || {};

  return (
    <header className="header">
      <div className="header-title">{title}</div>

      {user && (
        <div className="header-right">
          {/* Role badge */}
          <span className="header-role-badge" style={roleStyle}>
            {user.role}
          </span>

          {/* User name */}
          <span className="header-username">{user.name}</span>

          <span className="header-divider">|</span>

          {/* Logout */}
          <button className="header-logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
