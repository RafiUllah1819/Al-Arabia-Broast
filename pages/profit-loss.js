import { useState, useEffect, useCallback } from "react";
import PageLoader from "../components/ui/PageLoader";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function last7StartStr() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}
function last30StartStr() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmtK(n) {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
}
function fmtDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}
function monthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Trend Chart ───────────────────────────────────────────────────────────────
// Pure CSS — no library. Shows daily profit (green) / loss (red) bars
// growing up / down from a central zero line.

function TrendChart({ rows }) {
  // Rows come in descending order; we want chronological for the chart.
  // Cap at 30 most-recent days.
  const display = [...rows].reverse().slice(-30);

  if (display.length === 0) {
    return (
      <div className="pl-trend-empty">No data in this range.</div>
    );
  }

  const maxAbs = Math.max(...display.map((r) => Math.abs(parseFloat(r.profit))), 1);

  return (
    <div className="pl-trend-chart">
      {display.map((r) => {
        const profit = parseFloat(r.profit);
        const pct    = Math.round((Math.abs(profit) / maxAbs) * 100);
        const isPos  = profit >= 0;
        const day    = String(new Date(r.date + "T00:00:00").getDate());
        const tip    = `${fmtDate(r.date)}\nSales: Rs. ${fmt(r.sales)}\nExpenses: Rs. ${fmt(r.expenses)}\nProfit: ${profit >= 0 ? "+" : ""}Rs. ${fmt(profit)}`;

        return (
          <div key={r.date} className="pl-trend-col" title={tip}>
            {/* Profit half — bar grows upward from zero line */}
            <div className="pl-trend-half">
              {isPos && pct > 0 && (
                <div
                  className="pl-trend-bar pl-bar-profit"
                  style={{ height: `${pct}%` }}
                />
              )}
            </div>

            {/* Zero line */}
            <div className="pl-trend-zero" />

            {/* Loss half — bar grows downward from zero line */}
            <div className="pl-trend-half pl-trend-half-loss">
              {!isPos && pct > 0 && (
                <div
                  className="pl-trend-bar pl-bar-loss"
                  style={{ height: `${pct}%` }}
                />
              )}
            </div>

            <span className="pl-trend-label">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Period Block (Today / This Month) ─────────────────────────────────────────

function PeriodBlock({ title, sub, data }) {
  if (!data) return null;
  const profit      = parseFloat(data.profit);
  const isProfit    = profit >= 0;
  const profitColor = isProfit ? "#22C55E" : "#EF4444";
  const profitBg    = isProfit ? "#F0FDF4" : "#FEF2F2";
  const margin      = data.sales > 0
    ? `${((profit / data.sales) * 100).toFixed(1)}% margin`
    : null;

  return (
    <div className="pl-period-block">
      <div className="pl-period-header">
        <span className="pl-period-title">{title}</span>
        <span className="pl-period-sub">{sub}</span>
      </div>
      <div className="pl-period-stats">
        {/* Sales */}
        <div className="pl-stat">
          <span className="pl-stat-label">Sales</span>
          <span className="pl-stat-value" style={{ color: "#3B82F6" }}>
            Rs. {fmtK(data.sales)}
          </span>
          <span className="pl-stat-hint">Paid orders</span>
        </div>

        <div className="pl-stat-divider" />

        {/* Expenses */}
        <div className="pl-stat">
          <span className="pl-stat-label">Expenses</span>
          <span className="pl-stat-value" style={{ color: "#F59E0B" }}>
            Rs. {fmtK(data.expenses)}
          </span>
          <span className="pl-stat-hint">All entries</span>
        </div>

        <div className="pl-stat-divider" />

        {/* Profit / Loss */}
        <div className="pl-stat" style={{ background: profitBg, borderRadius: 8, padding: "10px 16px" }}>
          <span className="pl-stat-label" style={{ color: profitColor }}>
            {isProfit ? "Profit" : "Loss"}
          </span>
          <span className="pl-stat-value" style={{ color: profitColor }}>
            {isProfit ? "+" : "−"} Rs. {fmtK(Math.abs(profit))}
          </span>
          <span className="pl-stat-hint">
            {margin || "Sales − Expenses"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Range presets ─────────────────────────────────────────────────────────────

const RANGE_PRESETS = [
  { label: "Today",       getFrom: todayStr,       getTo: todayStr },
  { label: "Last 7 Days", getFrom: last7StartStr,  getTo: todayStr },
  { label: "This Month",  getFrom: monthStartStr,  getTo: todayStr },
  { label: "Last 30 Days",getFrom: last30StartStr, getTo: todayStr },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfitLossPage() {
  const [dateFrom,     setDateFrom]     = useState(monthStartStr());
  const [dateTo,       setDateTo]       = useState(todayStr());
  const [activePreset, setActivePreset] = useState("This Month");

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [exporting, setExporting] = useState(false);

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

  async function handleExport(format) {
    setExporting(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo, format });
      const res    = await fetch(`/api/export/profit-loss?${params}`);
      if (!res.ok) { alert("Export failed. Please try again."); return; }
      const blob   = await res.blob();
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      a.href       = url;
      a.download   = `profit-loss-${dateFrom}-to-${dateTo}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function applyPreset(preset) {
    setActivePreset(preset.label);
    setDateFrom(preset.getFrom());
    setDateTo(preset.getTo());
  }

  function handleDateManual(field, val) {
    setActivePreset("");
    if (field === "from") setDateFrom(val);
    else setDateTo(val);
  }

  const today  = data?.today  || { sales: 0, expenses: 0, profit: 0 };
  const month  = data?.month  || { sales: 0, expenses: 0, profit: 0 };
  const range  = data?.range  || { rows: [], totals: { sales: 0, expenses: 0, profit: 0 }, categoryBreakdown: [] };
  const rows   = range.rows   || [];
  const cats   = range.categoryBreakdown || [];
  const totals = range.totals || { sales: 0, expenses: 0, profit: 0 };

  const rangeProfit      = parseFloat(totals.profit);
  const rangeProfitColor = rangeProfit >= 0 ? "#166534" : "#EF4444";
  const rangeProfitBg    = rangeProfit >= 0 ? "#DCFCE7" : "#FEF2F2";

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h1 className="page-title">Profit / Loss</h1>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => handleExport("csv")}
            disabled={exporting || !data}
            title="Download daily breakdown as CSV"
          >
            {exporting ? "Exporting…" : "↓ CSV"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport("json")}
            disabled={exporting || !data}
            title="Download as JSON"
          >
            {exporting ? "…" : "↓ JSON"}
          </button>
          <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          </span>
        </div>
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <div className="placeholder-page"><p className="form-error">{error}</p></div>
      ) : (
        <>
          {/* ── Section 1: Today + This Month fixed snapshots ── */}
          <div className="pl-summary-row">
            <PeriodBlock
              title="Today"
              sub={new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              data={today}
            />
            <PeriodBlock
              title="This Month"
              sub={monthLabel()}
              data={month}
            />
          </div>

          {/* ── Section 2: Trend chart ── */}
          {rows.length > 1 && (
            <div className="dash-chart-wrap" style={{ marginBottom: 20 }}>
              <div className="pl-trend-header">
                <p className="dash-section-title" style={{ marginBottom: 0 }}>
                  Daily Profit / Loss Trend
                </p>
                <span className="pl-trend-legend">
                  <span className="pl-legend-dot pl-legend-profit" /> Profit
                  <span className="pl-legend-dot pl-legend-loss"   /> Loss
                </span>
              </div>
              <div style={{ marginTop: 16 }}>
                <TrendChart rows={rows} />
              </div>
            </div>
          )}

          {/* ── Section 3: Date range detail ── */}
          <div className="dash-chart-wrap" style={{ padding: 0, overflow: "hidden" }}>

            {/* Range filter bar */}
            <div className="pl-range-filter">
              <div className="pl-range-presets">
                {RANGE_PRESETS.map((p) => (
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
              <div className="pl-range-dates">
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
              </div>
            </div>

            {loading ? (
              <PageLoader text="Updating…" />
            ) : rows.length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                No data for this period. Try adding expenses or check the date range.
              </div>
            ) : (
              <div className="pl-detail-grid">

                {/* Daily breakdown table */}
                <div className="pl-detail-table-wrap">
                  <p className="pl-detail-section-title">Daily Breakdown</p>
                  <div className="table-container" style={{ borderRadius: 0, border: "none", boxShadow: "none" }}>
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
                          const p     = parseFloat(r.profit);
                          const isPos = p >= 0;
                          return (
                            <tr key={r.date}>
                              <td style={{ fontWeight: 600 }}>{fmtDate(r.date)}</td>
                              <td style={{ textAlign: "right", color: "#3B82F6", fontWeight: 600 }}>
                                Rs.&nbsp;{fmt(r.sales)}
                              </td>
                              <td style={{ textAlign: "right", color: "#F59E0B", fontWeight: 600 }}>
                                Rs.&nbsp;{fmt(r.expenses)}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: isPos ? "#DCFCE7" : "#FEF2F2",
                                    color:      isPos ? "#166534" : "#EF4444",
                                    fontWeight: 700,
                                  }}
                                >
                                  {isPos ? "+" : "−"}&nbsp;Rs.&nbsp;{fmt(Math.abs(p))}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="pl-tfoot-row">
                          <td style={{ fontWeight: 700, color: "#111827" }}>
                            Total ({rows.length} {rows.length === 1 ? "day" : "days"})
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#3B82F6" }}>
                            Rs.&nbsp;{fmt(totals.sales)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#F59E0B" }}>
                            Rs.&nbsp;{fmt(totals.expenses)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span
                              className="badge"
                              style={{
                                background: rangeProfitBg,
                                color:      rangeProfitColor,
                                fontWeight: 700,
                                fontSize:   12,
                              }}
                            >
                              {rangeProfit >= 0 ? "+" : "−"}&nbsp;Rs.&nbsp;{fmt(Math.abs(rangeProfit))}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Expense breakdown by category */}
                <div className="pl-detail-cats-wrap">
                  <p className="pl-detail-section-title">Expenses by Category</p>
                  {cats.length === 0 ? (
                    <p style={{ padding: "16px 0", color: "#9CA3AF", fontSize: 14 }}>
                      No expenses recorded.
                    </p>
                  ) : (
                    <div className="pl-cats-list">
                      {cats.map((c) => {
                        const pct = totals.expenses > 0
                          ? Math.round((parseFloat(c.total) / totals.expenses) * 100)
                          : 0;
                        return (
                          <div key={c.category} className="pl-cat-row">
                            <div className="pl-cat-info">
                              <span className="pl-cat-name">{c.category}</span>
                              <span className="pl-cat-count">
                                {c.entry_count} {c.entry_count === 1 ? "entry" : "entries"}
                              </span>
                            </div>
                            <div className="pl-cat-bar-wrap">
                              <div className="pl-cat-bar" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="pl-cat-footer">
                              <span className="pl-cat-amount">Rs. {fmt(c.total)}</span>
                              <span className="pl-cat-pct">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
