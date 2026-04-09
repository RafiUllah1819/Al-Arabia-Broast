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

  // Beautiful loading screen while session is loading or user is being redirected
  if (loading || !user) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #14213D 0%, #1B2A4A 100%)",
        gap: "24px",
      }}>
        {/* Logo / brand mark */}
        <div style={{
          width: "72px",
          height: "72px",
          borderRadius: "20px",
          background: "#EF476F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "36px",
          boxShadow: "0 8px 32px rgba(239,71,111,0.4)",
          animation: "rm-pulse 1.8s ease-in-out infinite",
        }}>
          🍽️
        </div>

        {/* App name */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            color: "#fff",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            marginBottom: "4px",
          }}>
            Restaurant Manager
          </div>
          <div style={{ color: "#8899bb", fontSize: "13px" }}>
            Loading your workspace…
          </div>
        </div>

        {/* Animated bar */}
        <div style={{
          width: "180px",
          height: "4px",
          borderRadius: "99px",
          background: "rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            borderRadius: "99px",
            background: "#EF476F",
            animation: "rm-slide 1.4s ease-in-out infinite",
          }} />
        </div>

        <style>{`
          @keyframes rm-pulse {
            0%, 100% { transform: scale(1);   box-shadow: 0 8px 32px rgba(239,71,111,0.4); }
            50%       { transform: scale(1.08); box-shadow: 0 12px 40px rgba(239,71,111,0.6); }
          }
          @keyframes rm-slide {
            0%   { width: 0%;   margin-left: 0%; }
            50%  { width: 60%;  margin-left: 20%; }
            100% { width: 0%;   margin-left: 100%; }
          }
        `}</style>
      </div>
    );
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
