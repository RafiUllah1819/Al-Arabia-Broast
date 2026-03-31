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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar whenever the route changes (e.g. user taps a nav link)
  useEffect(() => {
    setSidebarOpen(false);
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
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Dark backdrop — only rendered/visible on tablet/mobile when sidebar is open */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main-area">
        <Header
          pathname={router.pathname}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
