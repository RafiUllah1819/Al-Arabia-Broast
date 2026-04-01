import { useState, useEffect, useCallback } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other",         label: "Other" },
];

// ── Expense Form Modal ────────────────────────────────────────────────────────

function ExpenseModal({ expense, categories, onSave, onClose }) {
  const editing = !!expense;

  const [form, setForm] = useState({
    categoryId:    expense?.category_id    || "",
    amount:        expense?.amount         || "",
    description:   expense?.description    || "",
    vendor:        expense?.vendor         || "",
    paymentMethod: expense?.payment_method || "cash",
    expenseDate:   expense?.expense_date?.slice(0, 10) || today(),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.categoryId) { setError("Please select a category."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Amount must be greater than 0."); return; }
    setSaving(true);
    setError("");

    const body = {
      categoryId:    parseInt(form.categoryId),
      amount:        parseFloat(form.amount),
      description:   form.description,
      vendor:        form.vendor,
      paymentMethod: form.paymentMethod,
      expenseDate:   form.expenseDate,
    };

    const url    = editing ? `/api/expenses/${expense.id}` : "/api/expenses";
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
      <div className="modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editing ? "Edit Expense" : "Add Expense"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="form-error">{error}</p>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-input"
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  required
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (Rs.) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.expenseDate}
                  onChange={(e) => set("expenseDate", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-input"
                  value={form.paymentMethod}
                  onChange={(e) => set("paymentMethod", e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Vendor / Supplier</label>
              <input
                type="text"
                className="form-input"
                value={form.vendor}
                onChange={(e) => set("vendor", e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Notes</label>
              <textarea
                className="form-input"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Optional notes…"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update Expense" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ expense, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Delete Expense</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: "#374151", marginBottom: 8 }}>
            Delete <strong>Rs. {fmt(expense.amount)}</strong> — {expense.category_name}?
          </p>
          {expense.description && (
            <p style={{ fontSize: 13, color: "#6B7280" }}>{expense.description}</p>
          )}
          <p style={{ fontSize: 13, color: "#EF4444", marginTop: 12 }}>This cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses,   setExpenses]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  // Filters
  const [dateFrom,    setDateFrom]    = useState(today());
  const [dateTo,      setDateTo]      = useState(today());
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [showAdd,     setShowAdd]     = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo)   params.set("date_to",   dateTo);
      if (categoryFilter) params.set("category_id", categoryFilter);

      const res  = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load expenses."); return; }
      setExpenses(data.expenses);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, categoryFilter]);

  useEffect(() => {
    fetch("/api/expense-categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  function handleSaved() {
    setShowAdd(false);
    setEditTarget(null);
    loadExpenses();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    loadExpenses();
  }

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Expenses</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Expense</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input type="date" className="form-input filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input type="date" className="form-input filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select className="form-input filter-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={loadExpenses}>Refresh</button>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div className="expense-summary-strip">
          <span className="expense-summary-label">
            {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
          </span>
          <span className="expense-summary-total">
            Total: <strong>Rs. {fmt(total)}</strong>
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="placeholder-page"><p style={{ color: "#999" }}>Loading…</p></div>
      ) : error ? (
        <div className="placeholder-page"><p className="form-error">{error}</p></div>
      ) : expenses.length === 0 ? (
        <div className="placeholder-page">
          <p style={{ color: "#9CA3AF", fontSize: 15 }}>No expenses found for this period.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
            Add first expense
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Vendor</th>
                <th>Payment</th>
                <th>Description</th>
                <th>Added By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDate(exp.expense_date)}</td>
                  <td>
                    <span className="badge" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      {exp.category_name}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: "#111827" }}>Rs. {fmt(exp.amount)}</td>
                  <td style={{ color: "#6B7280", fontSize: 13 }}>{exp.vendor || "—"}</td>
                  <td>
                    <span className="badge" style={{ background: "#F3F4F6", color: "#374151" }}>
                      {exp.payment_method.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ color: "#6B7280", fontSize: 13, maxWidth: 220 }}>{exp.description || "—"}</td>
                  <td style={{ color: "#6B7280", fontSize: 13 }}>{exp.created_by_name}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditTarget(exp)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setDeleteTarget(exp)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <ExpenseModal
          categories={categories}
          onSave={handleSaved}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editTarget && (
        <ExpenseModal
          expense={editTarget}
          categories={categories}
          onSave={handleSaved}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          expense={deleteTarget}
          onConfirm={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
