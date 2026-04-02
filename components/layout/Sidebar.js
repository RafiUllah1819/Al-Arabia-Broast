import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import { canAccess } from "../../lib/roles";

const NAV_GROUPS = [
  {
    section: "Operations",
    links: [
      { label: "Dashboard", href: "/dashboard", icon: "▦" },
      { label: "POS",       href: "/pos",       icon: "🖥" },
      { label: "Kitchen",   href: "/kitchen",   icon: "🍳" },
      { label: "Payments",  href: "/payments",  icon: "💳" },
      { label: "Orders",    href: "/orders",    icon: "📋" },
    ],
  },
  {
    section: "Management",
    links: [
      { label: "Menu",           href: "/menu",               icon: "📖" },
      { label: "Tables",         href: "/tables",             icon: "🪑" },
      { label: "Expenses",       href: "/expenses",           icon: "💸" },
      { label: "Exp. Categories",href: "/expense-categories", icon: "🏷" },
      { label: "Profit/Loss",    href: "/profit-loss",        icon: "📈" },
      { label: "Reports",        href: "/reports",            icon: "📊" },
      { label: "Staff",          href: "/staff",              icon: "👥" },
      { label: "Settings",       href: "/settings",           icon: "⚙" },
    ],
  },
];

const ROLE_LABELS = {
  admin:   "Administrator",
  manager: "Manager",
  cashier: "Cashier",
  kitchen: "Kitchen Staff",
  waiter:  "Waiter",
};

export default function Sidebar({ isCollapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const router   = useRouter();

  const sidebarClass = [
    "sidebar",
    isCollapsed  ? "sidebar-collapsed" : "",
    mobileOpen   ? "sidebar-open"      : "",
  ].filter(Boolean).join(" ");

  return (
    <aside className={sidebarClass}>

      {/* ── Logo + collapse toggle ── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-content">
          <span className="sidebar-logo-icon">🍽</span>
          {!isCollapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-name">Al-Arabia</span>
              <span className="sidebar-logo-sub">Broast and Pizza Point</span>
            </div>
          )}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "›" : "‹"}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => {
          const visibleLinks = group.links.filter((link) =>
            canAccess(user.role, link.href)
          );
          if (visibleLinks.length === 0) return null;

          return (
            <div key={group.section}>
              {!isCollapsed && (
                <div className="sidebar-section-label">{group.section}</div>
              )}
              {isCollapsed && <div className="sidebar-section-divider" />}

              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={router.pathname === link.href ? "active" : ""}
                  onClick={onMobileClose}
                  title={isCollapsed ? link.label : undefined}
                >
                  <span className="sidebar-icon">{link.icon}</span>
                  {!isCollapsed && <span>{link.label}</span>}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      {user && (
        <div className="sidebar-footer">
          {isCollapsed ? (
            <div className="sidebar-footer-avatar" title={`${user.name} (${user.role})`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-role-badge">{ROLE_LABELS[user.role] || user.role}</div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
