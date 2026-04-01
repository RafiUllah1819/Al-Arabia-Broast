import { useAuth } from "../../contexts/AuthContext";

const PAGE_TITLES = {
  "/dashboard":   "Dashboard",
  "/pos":         "Point of Sale",
  "/orders":      "Orders",
  "/kitchen":     "Kitchen Board",
  "/payments":    "Payments",
  "/menu":        "Menu Management",
  "/reports":     "Reports",
  "/expenses":            "Expenses",
  "/expense-categories":  "Expense Categories",
  "/profit-loss":         "Profit / Loss",
  "/users":       "Users",
  "/settings":    "Settings",
};

// Color for each role badge in the header
const ROLE_COLORS = {
  admin:   { background: "#FEF0F3", color: "#EF476F" },
  manager: { background: "#EFF6FF", color: "#3B82F6" },
  cashier: { background: "#DCFCE7", color: "#166534" },
  kitchen: { background: "#FFF7ED", color: "#F59E0B" },
};

export default function Header({ pathname, onMenuToggle }) {
  const { user, logout } = useAuth();
  const title            = PAGE_TITLES[pathname] || "Restaurant OS";
  const roleStyle        = ROLE_COLORS[user?.role] || {};

  return (
    <header className="header">
      <div className="header-left">
        {/* Hamburger — visible on tablet/mobile only (CSS hides on desktop) */}
        <button
          className="header-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <span className="header-menu-icon">☰</span>
        </button>
        <div className="header-title">{title}</div>
      </div>

      {user && (
        <div className="header-right">
          {/* Role badge */}
          <span className="header-role-badge" style={roleStyle}>
            {user.role}
          </span>

          {/* User name — hidden on small screens to save space */}
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
