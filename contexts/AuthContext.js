import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();
  const loggingOut            = useRef(false);

  // On mount, check if the user has an active session.
  // sessionStorage is cleared when the browser is closed (unlike cookies which
  // browsers restore via "Continue where you left off"). If the flag is missing
  // it means the browser was just opened fresh — destroy the server session and
  // go to login even if a cookie still exists.
  useEffect(() => {
    const sessionAlive = sessionStorage.getItem("session_alive");

    if (!sessionAlive) {
      // Browser was closed — force logout on the server then redirect to login
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        setUser(null);
        setLoading(false);
      });
      return;
    }

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data?.user || null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  // Intercept all fetch calls globally — if any API returns 401, the session
  // has expired or been destroyed (browser closed and reopened, or 12h inactive).
  // Automatically redirect to login without requiring any per-page handling.
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const res = await originalFetch(...args);

      // Only intercept our own API routes
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (
        res.status === 401 &&
        url.startsWith("/api/") &&
        !url.includes("/api/auth/") &&
        !loggingOut.current
      ) {
        loggingOut.current = true;
        setUser(null);
        router.push("/login");
      }

      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  async function logout() {
    loggingOut.current = true;
    sessionStorage.removeItem("session_alive");
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
