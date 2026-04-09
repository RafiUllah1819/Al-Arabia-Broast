import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import PageLoader from "../components/ui/PageLoader";

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const t = today();
  const y = yesterday();
  if (dateStr === t) return "Today";
  if (dateStr === y) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtDateFull(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash",  color: "#166534", bg: "#DCFCE7" },
  { value: "card",          label: "Card",  color: "#1E40AF", bg: "#DBEAFE" },
  { value: "bank_transfer", label: "Bank",  color: "#7C3AED", bg: "#F5F3FF" },
  { value: "other",         label: "Other", color: "#374151", bg: "#F3F4F6" },
];

function getPaymentStyle(method) {
  return PAYMENT_METHODS.find((m) => m.value === method) || PAYMENT_METHODS[3];
}

const PRESETS = [
  { label: "Today",      getFrom: today,      getTo: today },
  { label: "Yesterday",  getFrom: yesterday,  getTo: yesterday },
  { label: "This Week",  getFrom: weekStart,  getTo: today },
  { label: "This Month", getFrom: monthStart, getTo: today },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function AmountInput({ value, onChange, hasError }) {
  return (
    <div className={`exp-amount-wrap${hasError ? " input-error-wrap" : ""}`}>
      <span className="exp-amount-prefix">Rs.</span>
      <input
        type="number"
        className="exp-amount-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min="0.01"
        step="0.01"
        placeholder="0.00"
        required
      />
    </div>
  );
}

function PaymentPills({ value, onChange }) {
  return (
    <div className="exp-pay-pills">
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.value}
          type="button"
          className={`exp-pay-pill${value === m.value ? " active" : ""}`}
          style={value === m.value ? { background: m.bg, color: m.color, borderColor: m.color + "60" } : {}}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

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
  const [saving,     setSaving]     = useState(false);
  const [fieldError, setFieldError] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldError((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const errs = {};
    if (!form.categoryId) errs.categoryId = "Please select a category.";
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Enter a valid amount.";
    if (!form.expenseDate) errs.expenseDate = "Date is required.";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldError(errs); return; }
    setSaving(true);

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
      if (!res.ok) { setFieldError({ _form: data.error || "Failed to save." }); return; }
      onSave();
    } catch {
      setFieldError({ _form: "Network error. Please try again." });
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
          <div className="modal-body exp-form-body">

            {fieldError._form && (
              <div className="exp-form-error-banner">{fieldError._form}</div>
            )}

            {/* ── Category ── */}
            <div className="form-group">
              <label className="form-label">Category <span className="exp-required">*</span></label>
              <select
                className={`form-input exp-category-select${fieldError.categoryId ? " input-error" : ""}`}
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {fieldError.categoryId && <p className="exp-field-error">{fieldError.categoryId}</p>}
            </div>

            {/* ── Amount ── */}
            <div className="form-group">
              <label className="form-label">Amount <span className="exp-required">*</span></label>
              <AmountInput
                value={form.amount}
                onChange={(v) => set("amount", v)}
                hasError={!!fieldError.amount}
              />
              {fieldError.amount && <p className="exp-field-error">{fieldError.amount}</p>}
            </div>

            {/* ── Date + Payment ── */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date <span className="exp-required">*</span></label>
                <div className="exp-date-row">
                  <input
                    type="date"
                    className={`form-input exp-date-input${fieldError.expenseDate ? " input-error" : ""}`}
                    value={form.expenseDate}
                    onChange={(e) => set("expenseDate", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="exp-date-preset"
                    onClick={() => set("expenseDate", today())}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="exp-date-preset"
                    onClick={() => set("expenseDate", yesterday())}
                  >
                    Yest.
                  </button>
                </div>
                {fieldError.expenseDate && <p className="exp-field-error">{fieldError.expenseDate}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <PaymentPills value={form.paymentMethod} onChange={(v) => set("paymentMethod", v)} />
              </div>
            </div>

            {/* ── Vendor ── */}
            <div className="form-group">
              <label className="form-label">
                Vendor / Supplier
                <span className="exp-optional">optional</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={form.vendor}
                onChange={(e) => set("vendor", e.target.value)}
                placeholder="Who was paid?"
              />
            </div>

            {/* ── Notes ── */}
            <div className="form-group">
              <label className="form-label">
                Notes
                <span className="exp-optional">optional</span>
              </label>
              <textarea
                className="form-input exp-notes-textarea"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                placeholder="Any additional details…"
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
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
  const pm = getPaymentStyle(expense.payment_method);

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
      <div className="modal exp-delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: "#EF4444" }}>Delete Expense?</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ gap: 12 }}>

          {/* Expense preview card */}
          <div className="exp-delete-card">
            <p className="exp-delete-amount">Rs. {fmt(expense.amount)}</p>
            <div className="exp-delete-meta">
              <span className="badge" style={{ background: "#FEF3C7", color: "#92400E" }}>
                {expense.category_name}
              </span>
              <span
                className="badge"
                style={{ background: pm.bg, color: pm.color }}
              >
                {pm.label}
              </span>
              <span style={{ fontSize: 13, color: "#6B7280" }}>
                {fmtDateShort(expense.expense_date?.slice(0, 10))}
              </span>
            </div>
            {expense.description && (
              <p className="exp-delete-note">"{expense.description}"</p>
            )}
          </div>

          <p style={{ fontSize: 13, color: "#EF4444", margin: 0 }}>
            This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            style={{ background: "#EF4444", color: "#fff", border: "none" }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { user }  = useAuth();

  const [expenses,        setExpenses]        = useState([]);
  const [categories,      setCategories]      = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [clearing,        setClearing]        = useState(false);

  const [dateFrom,        setDateFrom]        = useState(today());
  const [dateTo,          setDateTo]          = useState(today());
  const [categoryFilter,  setCategoryFilter]  = useState("");
  const [activePreset,    setActivePreset]    = useState("Today");

  const [showAdd,         setShowAdd]         = useState(false);
  const [editTarget,      setEditTarget]      = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [exporting,       setExporting]       = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateFrom)       params.set("date_from",   dateFrom);
      if (dateTo)         params.set("date_to",     dateTo);
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

  function applyPreset(preset) {
    setActivePreset(preset.label);
    setDateFrom(preset.getFrom());
    setDateTo(preset.getTo());
  }

  function handleDateManual(field, val) {
    setActivePreset(""); // clear highlight when user types custom range
    if (field === "from") setDateFrom(val);
    else setDateTo(val);
  }

  async function handleExport(format) {
    if (!dateFrom || !dateTo) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo, format });
      if (categoryFilter) params.set("category_id", categoryFilter);
      const res  = await fetch(`/api/export/expenses?${params}`);
      if (!res.ok) { alert("Export failed. Please try again."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `expenses-${dateFrom}-to-${dateTo}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleClearAll() {
    if (!confirm("This will permanently delete ALL expense records.\n\nAre you sure?")) return;
    setClearing(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/clear-expenses", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to clear expenses."); return; }
      setExpenses([]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setClearing(false);
    }
  }

  function handleSaved() {
    setShowAdd(false);
    setEditTarget(null);
    loadExpenses();
  }

  function handleDeleted() {
    setDeleteTarget(null);
    loadExpenses();
  }

  // Group by date for the date-section table layout
  const grouped = expenses.reduce((acc, exp) => {
    const d = exp.expense_date?.slice(0, 10) || "";
    if (!acc[d]) acc[d] = [];
    acc[d].push(exp);
    return acc;
  }, {});
  const groupDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  const periodLabel =
    dateFrom === dateTo
      ? fmtDateShort(dateFrom)
      : `${fmtDateShort(dateFrom)} – ${fmtDateShort(dateTo)}`;

  const activeCatName = categoryFilter
    ? (categories.find((c) => String(c.id) === String(categoryFilter))?.name || "")
    : "";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Expenses</h1>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => handleExport("csv")}
            disabled={exporting}
            title="Download as CSV"
          >
            {exporting ? "Exporting…" : "↓ CSV"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport("json")}
            disabled={exporting}
            title="Download as JSON"
          >
            {exporting ? "…" : "↓ JSON"}
          </button>
          {user?.role === "admin" && (
            <button
              className="btn"
              style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
              onClick={handleClearAll}
              disabled={clearing}
            >
              {clearing ? "Clearing…" : "Clear All Expenses"}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* ── Filter panel ── */}
      <div className="exp-filter-panel">

        {/* Preset quick-select row */}
        <div className="exp-preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`exp-preset-btn${activePreset === p.label ? " active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range + category row */}
        <div className="exp-filter-controls">
          <div className="filter-group">
            <label className="filter-label">From</label>
            <input
              type="date"
              className="form-input filter-input"
              value={dateFrom}
              onChange={(e) => handleDateManual("from", e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">To</label>
            <input
              type="date"
              className="form-input filter-input"
              value={dateTo}
              onChange={(e) => handleDateManual("to", e.target.value)}
            />
          </div>
          <div className="filter-group exp-cat-filter-group">
            <label className="filter-label">Category</label>
            <select
              className="form-input filter-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {categoryFilter && (
            <button
              className="exp-clear-filter"
              onClick={() => setCategoryFilter("")}
              title="Clear category filter"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Summary bar ── */}
      {!loading && !error && (
        <div className="exp-summary-bar">
          <div className="exp-summary-left">
            <span className="exp-summary-period">{periodLabel}</span>
            {activeCatName && (
              <span className="exp-summary-tag">{activeCatName}</span>
            )}
          </div>
          <div className="exp-summary-right">
            <span className="exp-summary-count">
              {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
            </span>
            <span className="exp-summary-divider" />
            <span className="exp-summary-total">Rs. {fmt(total)}</span>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="placeholder-page">
          <p className="form-error">{error}</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="exp-empty">
          <div className="exp-empty-icon">💸</div>
          <p className="exp-empty-title">No expenses found</p>
          <p className="exp-empty-sub">
            {activePreset === "Today"
              ? "Nothing recorded for today yet."
              : "No entries match this date range or category."}
          </p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            Add Expense
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table exp-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Vendor</th>
                <th>Payment</th>
                <th>Notes</th>
                <th>Added By</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {groupDates.map((date) => {
                const rows      = grouped[date];
                const dateTotal = rows.reduce((s, e) => s + parseFloat(e.amount), 0);
                return (
                  <>
                    {/* Date section header */}
                    <tr key={`date-${date}`} className="exp-date-group-row">
                      <td colSpan={7} className="exp-date-group-cell">
                        <span className="exp-date-group-label">{fmtDateFull(date)}</span>
                        <span className="exp-date-group-total">Rs. {fmt(dateTotal)}</span>
                      </td>
                    </tr>

                    {/* Expense rows */}
                    {rows.map((exp) => {
                      const pm = getPaymentStyle(exp.payment_method);
                      return (
                        <tr key={exp.id} className="exp-row">
                          <td>
                            <span className="badge exp-cat-badge">
                              {exp.category_name}
                            </span>
                          </td>
                          <td className="exp-amount-cell">
                            Rs.&nbsp;{fmt(exp.amount)}
                          </td>
                          <td className="exp-secondary-cell">
                            {exp.vendor || <span className="exp-nil">—</span>}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{ background: pm.bg, color: pm.color }}
                            >
                              {pm.label}
                            </span>
                          </td>
                          <td className="exp-notes-cell">
                            {exp.description
                              ? <span className="exp-notes-text">{exp.description}</span>
                              : <span className="exp-nil">—</span>
                            }
                          </td>
                          <td className="exp-secondary-cell">{exp.created_by_name}</td>
                          <td>
                            <div className="exp-row-actions">
                              <button
                                className="exp-action-btn exp-action-edit"
                                onClick={() => setEditTarget(exp)}
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                className="exp-action-btn exp-action-delete"
                                onClick={() => setDeleteTarget(exp)}
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })}
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
