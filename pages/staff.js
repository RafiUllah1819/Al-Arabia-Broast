import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import UserFormModal from "../components/users/UserFormModal";
import PageLoader from "../components/ui/PageLoader";

const ROLE_COLORS = {
  admin:   { background: "#FEF0F3", color: "#EF476F" },
  manager: { background: "#EFF6FF", color: "#3B82F6" },
  cashier: { background: "#DCFCE7", color: "#166534" },
  kitchen: { background: "#FFF7ED", color: "#F59E0B" },
  waiter:  { background: "#F5F3FF", color: "#7C3AED" },
};

export default function StaffPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res  = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
  }

  function handleSaved(savedUser, wasEditing) {
    if (wasEditing) {
      setUsers((prev) => prev.map((u) => (u.id === savedUser.id ? { ...u, ...savedUser } : u)));
    } else {
      setUsers((prev) => [...prev, savedUser]);
    }
    closeModal();
  }

  async function handleToggleActive(user) {
    setActionError("");
    const newStatus = !user.is_active;

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
    );

    const res  = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newStatus }),
    });
    const data = await res.json();

    if (!res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u))
      );
      setActionError(data.error || "Failed to update staff status.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Staff
        </button>
      </div>

      {actionError && <p className="form-error" style={{ marginBottom: "12px" }}>{actionError}</p>}

      <div className="table-container">
        {loading ? (
          <PageLoader />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td style={{ color: "#888" }}>{user.username}</td>
                  <td>
                    <span className="badge" style={ROLE_COLORS[user.role] || {}}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={
                        user.is_active
                          ? { background: "#DCFCE7", color: "#166534" }
                          : { background: "#F3F4F6", color: "#9CA3AF" }
                      }
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        style={
                          user.is_active
                            ? { background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }
                            : { background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC" }
                        }
                        onClick={() => handleToggleActive(user)}
                        disabled={user.id === currentUser?.id}
                        title={user.id === currentUser?.id ? "Cannot deactivate your own account" : ""}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#bbb", padding: "32px" }}>
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
