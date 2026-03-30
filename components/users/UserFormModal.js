import { useState, useEffect } from "react";

const ROLES = ["admin", "manager", "cashier", "kitchen", "waiter"];

const EMPTY_FORM = { name: "", username: "", password: "", role: "cashier" };

export default function UserFormModal({ user, onClose, onSaved }) {
  const isEditing = Boolean(user);

  const [form, setForm]       = useState(EMPTY_FORM);
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (user) {
      setForm({ name: user.name, username: user.username, password: "", role: user.role });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [user]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const url    = isEditing ? `/api/users/${user.id}` : "/api/users";
    const method = isEditing ? "PUT" : "POST";

    // For editing, only send password if the field is filled
    const body = { ...form };
    if (isEditing && !body.password) delete body.password;

    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      onSaved(data.user, isEditing);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h3>{isEditing ? "Edit User" : "Add User"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. John Smith"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. john"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Password
                {isEditing && (
                  <span className="form-hint"> — leave blank to keep current</span>
                )}
              </label>
              <input
                className="form-input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={isEditing ? "Leave blank to keep current" : "Min. 6 characters"}
                required={!isEditing}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-input"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="form-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
