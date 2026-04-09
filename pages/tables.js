import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import PageLoader from "../components/ui/PageLoader";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtAgo(dateStr) {
  if (!dateStr) return null;
  const mins = Math.round((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
}

const STATUS_META = {
  available: { label: "Available", cardCls: "tables-card-available", badgeCls: "tcb-available", activeColor: "#22C55E" },
  occupied:  { label: "Occupied",  cardCls: "tables-card-occupied",  badgeCls: "tcb-occupied",  activeColor: "#F59E0B" },
  reserved:  { label: "Reserved",  cardCls: "tables-card-reserved",  badgeCls: "tcb-reserved",  activeColor: "#3B82F6" },
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

// ── Table Card ─────────────────────────────────────────────────────────────────

function TableCard({ t, isAdmin, onEdit, onStatusChange, onToggleActive }) {
  const hasOpenBill = !!t.order_id;
  const meta = STATUS_META[t.status] || STATUS_META.available;
  const ago  = fmtAgo(t.order_opened_at);

  return (
    <div className={`tables-card ${hasOpenBill ? "tables-card-open-bill" : meta.cardCls}`}>

      {/* Header row: name + badge */}
      <div className="tables-card-top">
        <div>
          <div className="tables-card-name">{t.name}</div>
          <div className="tables-card-seats">{t.capacity} seats</div>
        </div>
        <span className={`tables-card-badge ${hasOpenBill ? "tcb-open" : meta.badgeCls}`}>
          {hasOpenBill ? "Open Bill" : meta.label}
        </span>
      </div>

      {/* Open bill details */}
      {hasOpenBill && (
        <div className="tables-card-bill-info">
          <div className="tables-card-amount">
            Rs. {parseFloat(t.bill_total || 0).toFixed(2)}
          </div>
          <div className="tables-card-bill-meta">
            {t.order_number && (
              <span className="tables-card-order-num">#{t.order_number}</span>
            )}
            {t.waiter_name && (
              <span className="tables-card-waiter">{t.waiter_name}</span>
            )}
            {ago && (
              <span className="tables-card-time">{ago}</span>
            )}
          </div>
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="tables-card-actions">
          {!hasOpenBill && (
            <div className="tables-card-status-btns">
              {["available", "occupied", "reserved"].map((s) => (
                <button
                  key={s}
                  className="btn btn-sm"
                  style={{
                    background: t.status === s ? STATUS_META[s].activeColor : "#F3F4F6",
                    color:      t.status === s ? "#fff" : "#6B7280",
                    border:     "none",
                    fontSize:   "11px",
                  }}
                  onClick={() => onStatusChange(t, s)}
                  disabled={t.status === s}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          )}
          <div className="tables-card-btn-row">
            <button className="btn btn-sm btn-secondary" onClick={onEdit}>
              Edit
            </button>
            <button
              className="btn btn-sm"
              style={{
                background: t.is_active ? "#FEF2F2" : "#DCFCE7",
                color:      t.is_active ? "#EF4444" : "#166534",
                border:     "none",
              }}
              onClick={() => onToggleActive(t)}
            >
              {t.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      )}
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

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [tabRes, liveRes] = await Promise.all([
        fetch("/api/tables").then((r) => r.json()),
        fetch("/api/pos/tables-with-bills").then((r) => r.json()),
      ]);
      const all     = tabRes.tables  || [];
      const liveMap = {};
      for (const t of (liveRes.tables || [])) liveMap[t.id] = t;
      // Merge live bill data onto every table record
      setTables(all.map((t) => ({ ...t, ...liveMap[t.id] })));
    } finally {
      setLoading(false);
    }
  }

  function handleSaved(saved, wasEditing) {
    if (wasEditing) {
      setTables((prev) => prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)));
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

  const openBillCount  = activeTables.filter((t) =>  t.order_id).length;
  const availableCount = activeTables.filter((t) => !t.order_id && t.status === "available").length;
  const reservedCount  = activeTables.filter((t) => t.status === "reserved").length;

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

      {/* Summary bar */}
      {!loading && (
        <div className="tables-summary">
          <div className="tables-summary-item" style={{ borderColor: "#22C55E" }}>
            <span className="tables-summary-count" style={{ color: "#22C55E" }}>{availableCount}</span>
            <span className="tables-summary-label">Available</span>
          </div>
          <div className="tables-summary-item" style={{ borderColor: "#F59E0B" }}>
            <span className="tables-summary-count" style={{ color: "#F59E0B" }}>{openBillCount}</span>
            <span className="tables-summary-label">Open Bill</span>
          </div>
          <div className="tables-summary-item" style={{ borderColor: "#3B82F6" }}>
            <span className="tables-summary-count" style={{ color: "#3B82F6" }}>{reservedCount}</span>
            <span className="tables-summary-label">Reserved</span>
          </div>
          <div className="tables-summary-item" style={{ borderColor: "#D1D5DB" }}>
            <span className="tables-summary-count" style={{ color: "#9CA3AF" }}>{activeTables.length}</span>
            <span className="tables-summary-label">Total Active</span>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Active tables card grid */}
          <div className="tables-card-grid">
            {activeTables.map((t) => (
              <TableCard
                key={t.id}
                t={t}
                isAdmin={isAdmin}
                onEdit={() => { setEditing(t); setModalOpen(true); }}
                onStatusChange={handleStatusChange}
                onToggleActive={handleToggleActive}
              />
            ))}
            {activeTables.length === 0 && (
              <p style={{ color: "#bbb", padding: "40px", gridColumn: "1/-1", textAlign: "center" }}>
                No active tables. Add your first table to get started.
              </p>
            )}
          </div>

          {/* Inactive tables — admin only */}
          {isAdmin && inactiveTables.length > 0 && (
            <div style={{ marginTop: "36px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "12px" }}>
                Inactive Tables
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th>Capacity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveTables.map((t) => (
                      <tr key={t.id} style={{ opacity: 0.6 }}>
                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                        <td style={{ color: "#888" }}>{t.capacity} seats</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn btn-sm"
                              style={{ background: "#DCFCE7", color: "#166534", border: "none" }}
                              onClick={() => handleToggleActive(t)}
                            >
                              Activate
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => { setEditing(t); setModalOpen(true); }}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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
