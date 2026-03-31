import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { getRoleHome } from "../lib/roles";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const homeLink = user ? getRoleHome(user.role) : "/login";

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <p style={styles.icon}>🚫</p>
        <h2 style={styles.title}>Access Denied</h2>
        <p style={styles.message}>
          You do not have permission to view this page.
        </p>
        {user && (
          <p style={styles.role}>
            You are signed in as <strong>{user.name}</strong> ({user.role})
          </p>
        )}
        <div style={styles.actions}>
          <Link href={homeLink} style={styles.link}>
            Go to my home page
          </Link>
          <span style={{ color: "#ccc" }}>·</span>
          <button onClick={logout} style={styles.logoutBtn}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#f5f5f5",
  },
  box: {
    textAlign: "center",
    background: "#fff",
    padding: "48px 40px",
    borderRadius: "8px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  icon: { fontSize: "36px", marginBottom: "12px" },
  title: { fontSize: "20px", marginBottom: "8px" },
  message: { color: "#777", fontSize: "13px", marginBottom: "8px" },
  role: { color: "#999", fontSize: "12px", marginBottom: "20px" },
  actions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    justifyContent: "center",
  },
  link: { color: "#EF476F", fontSize: "13px" },
  logoutBtn: {
    background: "none",
    border: "none",
    color: "#999",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
  },
};
