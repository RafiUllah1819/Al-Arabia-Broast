import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import { canAccess } from "../../lib/roles";

// All nav items grouped by section.
// Sidebar filters these at render time based on the logged-in user's role.
const NAV_GROUPS = [
  {
    section: "Operations",
    links: [
      { label: "Dashboard", href: "/dashboard", icon: "▦" },
      { label: "POS",       href: "/pos",       icon: "🖥" },
      { label: "Kitchen",   href: "/kitchen",   icon: "🍳" },
      { label: "Orders",    href: "/orders",    icon: "📋" },
      { label: "Payments",  href: "/payments",  icon: "💳" },
    ],
  },
  {
    section: "Management",
    links: [
      { label: "Menu",     href: "/menu",     icon: "📖" },
      { label: "Tables",   href: "/tables",   icon: "🪑" },
      { label: "Reports",  href: "/reports",  icon: "📊" },
      { label: "Staff",    href: "/staff",    icon: "👥" },
      { label: "Settings", href: "/settings", icon: "⚙" },
    ],
  },
];

// Human-readable label for each role shown in the sidebar footer.
const ROLE_LABELS = {
  admin:   "Administrator",
  manager: "Manager",
  cashier: "Cashier",
  kitchen: "Kitchen Staff",
  waiter:  "Waiter",
};

export default function Sidebar() {
  const { user } = useAuth();
  const router   = useRouter();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        🍽 Al-Arabia
        <span className="sidebar-logo-sub">Broast and Pizza Point</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => {
          // Only show links this role can access
          const visibleLinks = group.links.filter((link) =>
            canAccess(user.role, link.href)
          );

          // Hide the entire section if no links are visible
          if (visibleLinks.length === 0) return null;

          return (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={router.pathname === link.href ? "active" : ""}
                >
                  <span className="sidebar-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User info at the bottom of the sidebar */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user-name">{user.name}</div>
          <div className="sidebar-role-badge">{ROLE_LABELS[user.role] || user.role}</div>
        </div>
      )}
    </aside>
  );
}
