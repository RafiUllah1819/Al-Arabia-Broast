import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const STATUS_STYLE = {
  available: { background: "#DCFCE7", color: "#166534", label: "Available" },
  occupied:  { background: "#FEF3C7", color: "#92400E", label: "Occupied"  },
  reserved:  { background: "#EFF6FF", color: "#3B82F6", label: "Reserved"  },
};

// ── Table Form Modal ───────────────────────────────────────────────────────────

function TableFormModal({ table, onClose, onSaved }) {
  const isEditing = Boolean(table);
  const [form, setForm] = useState({
    name: "", capacity: "4", status: "available", is_active: true,
  });
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (table) {
      setForm({
        name:      table.name,
        capacity:  String(table.capacity),
        status:    table.status,
        is_active: table.is_active,
      });
    } else {
      setForm({ name: "", capacity: "4", status: "available", is_active: true });
    }
    setError("");
  }, [table]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const url    = isEditing ? `/api/tables/${table.id}` : "/api/tables";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      onSaved(data.table, isEditing);
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
          <h3>{isEditing ? "Edit Table" : "Add Table"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Table Name / Number</label>
                <input
                  className="form-input"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Table 1, VIP Room"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Capacity (seats)</label>
                <input
                  className="form-input"
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  min="1"
                  style={{ maxWidth: "100px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" name="status" value={form.status} onChange={handleChange}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              Active (visible in POS)
            </label>

            {error && <p className="form-error" style={{ marginTop: "12px" }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Table"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TablesPage() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin" || user?.role === "manager";

  const [tables,      setTables]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [actionError, setActionError] = useState("");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState(null);

  useEffect(() => { fetchTables(); }, []);

  async function fetchTables() {
    setLoading(true);
    try {
      const res  = await fetch("/api/tables");
      const data = await res.json();
      setTables(data.tables || []);
    } finally {
      setLoading(false);
    }
  }

  function handleSaved(saved, wasEditing) {
    if (wasEditing) {
      setTables((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTables((prev) => [...prev, saved]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleStatusChange(table, newStatus) {
    setActionError("");
    const prev = table.status;
    setTables((all) => all.map((t) => (t.id === table.id ? { ...t, status: newStatus } : t)));
    const res = await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "status", value: newStatus }),
    });
    if (!res.ok) {
      setTables((all) => all.map((t) => (t.id === table.id ? { ...t, status: prev } : t)));
      const data = await res.json();
      setActionError(data.error || "Failed to update status.");
    }
  }

  async function handleToggleActive(table) {
    setActionError("");
    const newVal = !table.is_active;
    setTables((all) => all.map((t) => (t.id === table.id ? { ...t, is_active: newVal } : t)));
    const res = await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "is_active", value: newVal }),
    });
    if (!res.ok) {
      setTables((all) => all.map((t) => (t.id === table.id ? { ...t, is_active: table.is_active } : t)));
      const data = await res.json();
      setActionError(data.error || "Failed to update.");
    }
  }

  const activeTables   = tables.filter((t) =>  t.is_active);
  const inactiveTables = tables.filter((t) => !t.is_active);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tables</h1>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => { setEditing(null); setModalOpen(true); }}
          >
            + Add Table
          </button>
        )}
      </div>

      {actionError && <p className="form-error" style={{ marginBottom: "12px" }}>{actionError}</p>}

      {/* Summary badges */}
      {!loading && (
        <div className="tables-summary">
          {Object.entries(STATUS_STYLE).map(([s, st]) => {
            const count = activeTables.filter((t) => t.status === s).length;
            return (
              <div key={s} className="tables-summary-item" style={{ borderColor: st.color }}>
                <span className="tables-summary-count" style={{ color: st.color }}>{count}</span>
                <span className="tables-summary-label">{st.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#999", padding: "24px 0" }}>Loading...</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Active</th>
                {isAdmin && <th style={{ width: "200px" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => {
                const st = STATUS_STYLE[t.status] || STATUS_STYLE.available;
                return (
                  <tr key={t.id} style={{ opacity: t.is_active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td style={{ color: "#888" }}>{t.capacity} seats</td>
                    <td>
                      <span className="badge" style={{ background: st.background, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td>
                      {isAdmin ? (
                        <button
                          className={`toggle-btn${t.is_active ? " active" : ""}`}
                          onClick={() => handleToggleActive(t)}
                        >
                          {t.is_active ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span style={{ color: t.is_active ? "#22C55E" : "#9CA3AF", fontSize: "12px" }}>
                          {t.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {/* Quick status buttons */}
                          {["available", "occupied", "reserved"].map((s) => (
                            <button
                              key={s}
                              className="btn btn-sm"
                              style={{
                                background: t.status === s ? STATUS_STYLE[s].color : "#f0f0f0",
                                color:      t.status === s ? "#fff" : "#555",
                                border:     "none",
                                fontSize:   "11px",
                              }}
                              onClick={() => handleStatusChange(t, s)}
                              disabled={t.status === s}
                            >
                              {STATUS_STYLE[s].label}
                            </button>
                          ))}
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setEditing(t); setModalOpen(true); }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {tables.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} style={{ textAlign: "center", color: "#bbb", padding: "40px" }}>
                    No tables yet. Add your first table to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <TableFormModal
          table={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
