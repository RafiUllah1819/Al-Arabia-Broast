import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import PageLoader from "../components/ui/PageLoader";

// ── Category Form Modal ───────────────────────────────────────────────────────

function CategoryModal({ category, onSave, onClose }) {
  const editing = !!category;

  const [name,      setName]      = useState(category?.name       || "");
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");

    const body   = { name: name.trim(), sortOrder: sortOrder !== "" ? parseInt(sortOrder) : 0 };
    const url    = editing ? `/api/expense-categories/${category.id}` : "/api/expense-categories";
    const method = editing ? "PUT" : "POST";

    try {
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save."); return; }
      onSave();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editing ? "Edit Category" : "New Category"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Staff Payment"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sort Order</label>
              <input
                type="number"
                className="form-input"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0 = default"
                min="0"
              />
              <p className="form-hint">Lower numbers appear first in dropdowns.</p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpenseCategoriesPage() {
  const { user }               = useAuth();
  const isAdmin                = user?.role === "admin";

  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const [showAdd,    setShowAdd]    = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/expense-categories?all=1");
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load."); return; }
      setCategories(data.categories);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(cat) {
    setTogglingId(cat.id);
    try {
      const res = await fetch(`/api/expense-categories/${cat.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !cat.is_active }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => c.id === cat.id ? { ...c, is_active: !cat.is_active } : c)
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  function handleSaved() {
    setShowAdd(false);
    setEditTarget(null);
    load();
  }

  const activeCount   = categories.filter((c) => c.is_active).length;
  const inactiveCount = categories.length - activeCount;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Categories</h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + New Category
          </button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="placeholder-page"><p className="form-error">{error}</p></div>
      ) : categories.length === 0 ? (
        <div className="placeholder-page">
          <p style={{ color: "#9CA3AF", fontSize: 15 }}>No categories yet.</p>
          {isAdmin && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
              Create first category
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Category Name</th>
                <th style={{ width: 100, textAlign: "center" }}>Sort</th>
                <th style={{ width: 120, textAlign: "center" }}>Expenses</th>
                <th style={{ width: 110, textAlign: "center" }}>Status</th>
                {isAdmin && <th style={{ width: 160, textAlign: "center" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id} style={{ opacity: cat.is_active ? 1 : 0.55 }}>
                  <td style={{ color: "#9CA3AF", fontSize: 13 }}>{idx + 1}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: cat.is_active ? "#111827" : "#9CA3AF" }}>
                      {cat.name}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", color: "#6B7280", fontSize: 13 }}>
                    {cat.sort_order}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {cat.expense_count > 0 ? (
                      <span className="badge" style={{ background: "#EFF6FF", color: "#3B82F6" }}>
                        {cat.expense_count} {cat.expense_count === 1 ? "entry" : "entries"}
                      </span>
                    ) : (
                      <span style={{ color: "#D1D5DB", fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      className="badge"
                      style={
                        cat.is_active
                          ? { background: "#DCFCE7", color: "#166534" }
                          : { background: "#F3F4F6", color: "#9CA3AF" }
                      }
                    >
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditTarget(cat)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm"
                          style={
                            cat.is_active
                              ? { background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }
                              : { background: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0" }
                          }
                          onClick={() => handleToggle(cat)}
                          disabled={togglingId === cat.id}
                        >
                          {togglingId === cat.id
                            ? "…"
                            : cat.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info note for managers */}
      {!isAdmin && (
        <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 16 }}>
          Contact an admin to add or change categories.
        </p>
      )}

      {/* Modals */}
      {showAdd && (
        <CategoryModal onSave={handleSaved} onClose={() => setShowAdd(false)} />
      )}
      {editTarget && (
        <CategoryModal
          category={editTarget}
          onSave={handleSaved}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
