import { useState, useEffect, useCallback } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, accent, sub }) {
  return (
    <div className="dash-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="dash-card-body">
        <p className="dash-card-label">{label}</p>
        <p className="dash-card-value" style={{ color: accent }}>{value}</p>
        {sub && <p className="dash-card-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo,   setDateTo]   = useState(today());
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const res    = await fetch(`/api/expenses/profit-loss?${params}`);
      const json   = await res.json();
      if (!res.ok) { setError(json.error || "Failed to load data."); return; }
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || { sales: 0, expenses: 0, profit: 0 };
  const rows   = data?.rows   || [];
  const cats   = data?.categoryBreakdown || [];

  const profitColor = totals.profit >= 0 ? "#22C55E" : "#EF4444";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profit / Loss</h1>
        <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Date range filter */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">From</label>
          <input type="date" className="form-input filter-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="filter-group">
          <label className="filter-label">To</label>
          <input type="date" className="form-input filter-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={load}>Apply</button>

        {/* Quick presets */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button className="btn btn-sm btn-secondary" onClick={() => { setDateFrom(today()); setDateTo(today()); }}>
            Today
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => { setDateFrom(firstOfMonth()); setDateTo(today()); }}>
            This Month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="placeholder-page"><p style={{ color: "#999" }}>Loading…</p></div>
      ) : error ? (
        <div className="placeholder-page"><p className="form-error">{error}</p></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="dash-cards" style={{ marginBottom: 24 }}>
            <SummaryCard
              label="Total Sales"
              value={`Rs. ${fmt(totals.sales)}`}
              accent="#3B82F6"
              sub="Paid orders in range"
            />
            <SummaryCard
              label="Total Expenses"
              value={`Rs. ${fmt(totals.expenses)}`}
              accent="#F59E0B"
              sub="All expense entries"
            />
            <SummaryCard
              label={totals.profit >= 0 ? "Net Profit" : "Net Loss"}
              value={`Rs. ${fmt(Math.abs(totals.profit))}`}
              accent={profitColor}
              sub="Sales minus expenses"
            />
            {totals.sales > 0 && (
              <SummaryCard
                label="Profit Margin"
                value={`${((totals.profit / totals.sales) * 100).toFixed(1)}%`}
                accent={profitColor}
                sub="Profit ÷ Sales"
              />
            )}
          </div>

          {/* Two-column: daily table + category breakdown */}
          <div className="pl-grid">

            {/* Daily breakdown table */}
            <div className="dash-chart-wrap">
              <p className="dash-section-title">Daily Breakdown</p>
              {rows.length === 0 ? (
                <p style={{ padding: "16px 24px", color: "#9CA3AF", fontSize: 14 }}>
                  No data for this period.
                </p>
              ) : (
                <div className="table-container" style={{ borderRadius: 0, border: "none", boxShadow: "none", borderTop: "1px solid #ebebeb" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th style={{ textAlign: "right" }}>Sales</th>
                        <th style={{ textAlign: "right" }}>Expenses</th>
                        <th style={{ textAlign: "right" }}>Profit / Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const profit = parseFloat(r.profit);
                        const color  = profit >= 0 ? "#166534" : "#EF4444";
                        const bg     = profit >= 0 ? "#DCFCE7" : "#FEF2F2";
                        return (
                          <tr key={r.date}>
                            <td style={{ fontWeight: 600 }}>{fmtDate(r.date)}</td>
                            <td style={{ textAlign: "right", color: "#3B82F6", fontWeight: 600 }}>
                              Rs. {fmt(r.sales)}
                            </td>
                            <td style={{ textAlign: "right", color: "#F59E0B", fontWeight: 600 }}>
                              Rs. {fmt(r.expenses)}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span className="badge" style={{ background: bg, color, fontWeight: 700 }}>
                                {profit >= 0 ? "+" : "−"} Rs. {fmt(Math.abs(profit))}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #E5E7EB" }}>
                        <td style={{ fontWeight: 700, color: "#111827" }}>Total</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#3B82F6" }}>
                          Rs. {fmt(totals.sales)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#F59E0B" }}>
                          Rs. {fmt(totals.expenses)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="badge" style={{
                            background: totals.profit >= 0 ? "#DCFCE7" : "#FEF2F2",
                            color:      totals.profit >= 0 ? "#166534" : "#EF4444",
                            fontWeight: 700,
                          }}>
                            {totals.profit >= 0 ? "+" : "−"} Rs. {fmt(Math.abs(totals.profit))}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Expense breakdown by category */}
            <div className="dash-chart-wrap">
              <p className="dash-section-title">Expenses by Category</p>
              {cats.length === 0 ? (
                <p style={{ padding: "16px 24px", color: "#9CA3AF", fontSize: 14 }}>
                  No expenses in this period.
                </p>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {cats.map((c) => {
                    const pct = totals.expenses > 0
                      ? Math.round((parseFloat(c.total) / totals.expenses) * 100)
                      : 0;
                    return (
                      <div key={c.category} className="pl-cat-row">
                        <div className="pl-cat-info">
                          <span className="pl-cat-name">{c.category}</span>
                          <span className="pl-cat-count">{c.entry_count} {c.entry_count === 1 ? "entry" : "entries"}</span>
                        </div>
                        <div className="pl-cat-bar-wrap">
                          <div className="pl-cat-bar" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="pl-cat-amount">Rs. {fmt(c.total)}</span>
                        <span className="pl-cat-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
