import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../contexts/AuthContext";
import { canAccess } from "../../lib/roles";
import Sidebar from "./Sidebar";
import Header from "./Header";

// Pages that render full-screen with no sidebar/header and skip auth checks.
const PUBLIC_PAGES = ["/login", "/unauthorized"];

export default function AppLayout({ children }) {
  const { user, loading } = useAuth();
  const router            = useRouter();
  const isPublic          = PUBLIC_PAGES.includes(router.pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen,       setMobileOpen]       = useState(false);

  // Close mobile sidebar whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (loading || isPublic) return;

    // Not logged in → send to login
    if (!user) {
      router.replace("/login");
      return;
    }

    // Logged in but this role cannot access this path → send to unauthorized
    if (!canAccess(user.role, router.pathname)) {
      router.replace("/unauthorized");
    }
  }, [user, loading, router.pathname]);

  // Public pages: render as-is, no layout wrapper
  if (isPublic) {
    return <>{children}</>;
  }

  // Blank while session is loading or user is being redirected
  if (loading || !user) {
    return null;
  }

  // Don't render content if role check fails (redirect is in-flight)
  if (!canAccess(user.role, router.pathname)) {
    return null;
  }

  return (
    <div className={`app-layout${sidebarCollapsed ? " sidebar-is-collapsed" : ""}`}>
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Dark backdrop — mobile/tablet only */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <div className="main-area">
        <Header
          pathname={router.pathname}
          onMenuToggle={() => setMobileOpen((o) => !o)}
        />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
