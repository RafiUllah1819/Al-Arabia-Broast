import { useState, useEffect, useCallback } from "react";
import PageLoader from "../components/ui/PageLoader";

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d) { return d.toISOString().slice(0, 10); }

function getPreset(preset) {
  const today = new Date();
  const to    = toISO(today);
  if (preset === "today") {
    return { from: to, to };
  }
  if (preset === "7d") {
    const from = new Date(today); from.setDate(from.getDate() - 6);
    return { from: toISO(from), to };
  }
  if (preset === "30d") {
    const from = new Date(today); from.setDate(from.getDate() - 29);
    return { from: toISO(from), to };
  }
  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(from), to };
  }
  return { from: to, to };
}

function fmt(n) { return parseFloat(n || 0).toFixed(2); }

function fmtDate(str) {
  if (!str) return "—";
  // Slice to YYYY-MM-DD so this works whether the backend returns a plain date
  // string OR a full ISO timestamp (e.g. "2024-01-15T00:00:00.000Z").
  // Appending T12:00:00 keeps the date stable across all timezone offsets.
  const d = new Date(String(str).slice(0, 10) + "T12:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ── Date range bar ────────────────────────────────────────────────────────────

function DateRangeBar({ from, to, onFromChange, onToChange, onApply }) {
  const PRESETS = [
    { key: "today", label: "Today"    },
    { key: "7d",    label: "7 Days"   },
    { key: "30d",   label: "30 Days"  },
    { key: "month", label: "This Month" },
  ];

  function applyPreset(p) {
    const range = getPreset(p);
    onFromChange(range.from);
    onToChange(range.to);
    onApply(range.from, range.to);
  }

  return (
    <div className="report-date-bar">
      <div className="report-presets">
        {PRESETS.map((p) => (
          <button key={p.key} className="btn btn-sm btn-secondary" onClick={() => applyPreset(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="report-custom-range">
        <input className="form-input report-date-input" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
        <span style={{ color: "#aaa", fontSize: "13px" }}>to</span>
        <input className="form-input report-date-input" type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={() => onApply(from, to)}>Apply</button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyRows() {
  return (
    <tr>
      <td colSpan={10} style={{ textAlign: "center", color: "#bbb", padding: "32px" }}>
        No data for this period.
      </td>
    </tr>
  );
}

// ── Report: Daily Sales ───────────────────────────────────────────────────────

function DailySalesReport({ rows }) {
  const totalRev    = rows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);
  const totalOrders = rows.reduce((s, r) => s + parseInt(r.order_count || 0), 0);

  return (
    <div>
      {rows.length > 0 && (
        <div className="report-summary-row">
          <span><strong>{totalOrders}</strong> orders</span>
          <span style={{ color: "#ddd" }}>|</span>
          <span>Total Revenue: <strong>${fmt(totalRev)}</strong></span>
        </div>
      )}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Orders</th>
              <th style={{ textAlign: "right" }}>Revenue</th>
              <th style={{ textAlign: "right" }}>Avg Order</th>
              <th style={{ textAlign: "right" }}>Subtotal</th>
              <th style={{ textAlign: "right" }}>Tax</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{fmtDate(r.date)}</td>
                <td style={{ textAlign: "right" }}>{r.order_count}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>${fmt(r.revenue)}</td>
                <td style={{ textAlign: "right", color: "#888" }}>${fmt(r.avg_order_value)}</td>
                <td style={{ textAlign: "right", color: "#888" }}>${fmt(r.subtotal_sum)}</td>
                <td style={{ textAlign: "right", color: "#888" }}>${fmt(r.tax_sum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Report: Product Sales (by product + variant, date range) ─────────────────

function ProductSalesReport({ rows }) {
  const maxQty    = Math.max(...rows.map((r) => parseInt(r.total_qty || 0)), 1);
  const totalQty  = rows.reduce((s, r) => s + parseInt(r.total_qty || 0), 0);
  const totalRev  = rows.reduce((s, r) => s + parseFloat(r.total_revenue || 0), 0);

  return (
    <div>
      {rows.length > 0 && (
        <div className="report-summary-row">
          <span><strong>{rows.length}</strong> products</span>
          <span style={{ color: "#ddd" }}>|</span>
          <span><strong>{totalQty}</strong> units sold</span>
          <span style={{ color: "#ddd" }}>|</span>
          <span>Revenue: <strong>Rs. {fmt(totalRev)}</strong></span>
        </div>
      )}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "30px" }}>#</th>
              <th>Product</th>
              <th style={{ width: "180px" }}>Qty Sold</th>
              <th style={{ textAlign: "right" }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r, i) => {
              const name = r.variant_name
                ? `${r.product_name} — ${r.variant_name}`
                : r.product_name;
              const qty = parseInt(r.total_qty || 0);
              const pct = Math.round((qty / maxQty) * 100);
              return (
                <tr key={i}>
                  <td style={{ color: "#aaa", fontSize: "12px" }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{name}</td>
                  <td>
                    <div className="report-bar-wrap">
                      <div className="report-bar" style={{ width: `${pct}%` }} />
                      <span className="report-bar-label">{qty}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>Rs. {fmt(r.total_revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Report: Top Products ──────────────────────────────────────────────────────

function TopProductsReport({ rows }) {
  const maxQty = Math.max(...rows.map((r) => parseInt(r.total_qty || 0)), 1);

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: "30px" }}>#</th>
            <th>Product</th>
            <th style={{ width: "180px" }}>Units Sold</th>
            <th style={{ textAlign: "right" }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyRows /> : rows.map((r, i) => {
            const qty = parseInt(r.total_qty || 0);
            const pct = Math.round((qty / maxQty) * 100);
            return (
              <tr key={i}>
                <td style={{ color: "#aaa", fontSize: "12px" }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{r.product_name}</td>
                <td>
                  <div className="report-bar-wrap">
                    <div className="report-bar" style={{ width: `${pct}%` }} />
                    <span className="report-bar-label">{qty}</span>
                  </div>
                </td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>${fmt(r.total_revenue)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Report: Payment Summary ───────────────────────────────────────────────────

function PaymentSummaryReport({ rows }) {
  const grandTotal = rows.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);

  return (
    <div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Method</th>
              <th style={{ textAlign: "right" }}>Transactions</th>
              <th style={{ textAlign: "right" }}>Total Collected</th>
              <th style={{ textAlign: "right" }}>Avg Transaction</th>
              <th style={{ textAlign: "right" }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r, i) => {
              const share = grandTotal > 0
                ? Math.round((parseFloat(r.total_amount) / grandTotal) * 100)
                : 0;
              return (
                <tr key={i}>
                  <td>
                    <span className="badge" style={
                      r.method === "cash"
                        ? { background: "#DCFCE7", color: "#166534" }
                        : { background: "#EFF6FF", color: "#3B82F6" }
                    }>
                      {r.method}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>{r.transaction_count}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>${fmt(r.total_amount)}</td>
                  <td style={{ textAlign: "right", color: "#888" }}>${fmt(r.avg_amount)}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="report-bar-wrap" style={{ justifyContent: "flex-end" }}>
                      <div className="report-bar" style={{ width: `${share}%`, maxWidth: "80px" }} />
                      <span className="report-bar-label">{share}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length > 0 && (
              <tr style={{ background: "#fafafa", fontWeight: 700 }}>
                <td>Total</td>
                <td style={{ textAlign: "right" }}>
                  {rows.reduce((s, r) => s + parseInt(r.transaction_count || 0), 0)}
                </td>
                <td style={{ textAlign: "right" }}>${fmt(grandTotal)}</td>
                <td />
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Report: Cashier Sales ─────────────────────────────────────────────────────

function CashierSalesReport({ rows }) {
  const grandTotal = rows.reduce((s, r) => s + parseFloat(r.total_revenue || 0), 0);

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Cashier</th>
            <th style={{ textAlign: "right" }}>Orders</th>
            <th style={{ textAlign: "right" }}>Total Revenue</th>
            <th style={{ textAlign: "right" }}>Avg Order</th>
            <th style={{ textAlign: "right" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyRows /> : rows.map((r, i) => {
            const share = grandTotal > 0
              ? Math.round((parseFloat(r.total_revenue) / grandTotal) * 100)
              : 0;
            return (
              <tr key={i}>
                <td style={{ color: "#aaa", fontSize: "12px" }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{r.cashier_name}</td>
                <td style={{ textAlign: "right" }}>{r.order_count}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>${fmt(r.total_revenue)}</td>
                <td style={{ textAlign: "right", color: "#888" }}>${fmt(r.avg_order_value)}</td>
                <td style={{ textAlign: "right" }}>
                  <div className="report-bar-wrap" style={{ justifyContent: "flex-end" }}>
                    <div className="report-bar" style={{ width: `${share}%`, maxWidth: "80px" }} />
                    <span className="report-bar-label">{share}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Export / Backup ───────────────────────────────────────────────────────────

function ExportTab({ from, to }) {
  const [exporting, setExporting] = useState(null); // tracks which export is running
  const [exportError, setExportError] = useState("");

  async function triggerDownload(path, filename) {
    setExporting(filename);
    setExportError("");
    try {
      const res = await fetch(path);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setExportError(d.error || "Export failed.");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Network error. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  const EXPORTS = [
    {
      key:      "orders",
      label:    "Export Orders",
      desc:     "All orders with type, status, total, and customer info.",
      filename: `orders-${from}-to-${to}.csv`,
      path:     () => `/api/export/orders?from=${from}&to=${to}`,
      format:   "CSV",
    },
    {
      key:      "payments",
      label:    "Export Payments",
      desc:     "All collected payments with method, amount, and change.",
      filename: `payments-${from}-to-${to}.csv`,
      path:     () => `/api/export/payments?from=${from}&to=${to}`,
      format:   "CSV",
    },
    {
      key:      "products",
      label:    "Export Products",
      desc:     "Full product catalogue with categories and prices.",
      filename: `products.csv`,
      path:     () => `/api/export/products`,
      format:   "CSV",
    },
    {
      key:      "backup",
      label:    "Full Backup",
      desc:     "Complete JSON backup: orders, payments, products, and settings.",
      filename: `backup-${new Date().toISOString().slice(0,10)}.json`,
      path:     () => `/api/export/backup`,
      format:   "JSON",
    },
  ];

  return (
    <div style={{ maxWidth: "640px" }}>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
        Orders and payments use the date range selected above.
        Products and Full Backup always export all records.
      </p>

      {exportError && (
        <p className="form-error" style={{ marginBottom: "16px" }}>{exportError}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {EXPORTS.map((exp) => (
          <div key={exp.key} className="export-card">
            <div className="export-card-info">
              <div className="export-card-title">{exp.label}</div>
              <div className="export-card-desc">{exp.desc}</div>
            </div>
            <div className="export-card-action">
              <span className="export-format-badge">{exp.format}</span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={exporting !== null}
                onClick={() => triggerDownload(exp.path(), exp.filename)}
              >
                {exporting === exp.filename ? "Downloading…" : "Download"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { key: "daily_sales",     label: "Daily Sales"      },
  { key: "top_products",    label: "Top Products"     },
  { key: "product_sales",   label: "Product Sales"    },
  { key: "payment_summary", label: "Payment Summary"  },
  { key: "cashier_sales",   label: "Cashier Sales"    },
  { key: "export",          label: "Export / Backup"  },
];

const REPORT_COMPONENTS = {
  daily_sales:     DailySalesReport,
  top_products:    TopProductsReport,
  product_sales:   ProductSalesReport,
  payment_summary: PaymentSummaryReport,
  cashier_sales:   CashierSalesReport,
  export:          null, // rendered separately — does not use the rows/fetch flow
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const defaultRange = getPreset("7d");

  const [activeTab, setActiveTab] = useState("daily_sales");
  const [from,      setFrom]      = useState(defaultRange.from);
  const [to,        setTo]        = useState(defaultRange.to);
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const fetchReport = useCallback((type, f, t) => {
    setLoading(true);
    setError("");
    setRows([]);
    fetch(`/api/reports?type=${type}&from=${f}&to=${t}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setRows(data.rows || []);
      })
      .catch(() => setError("Failed to load report."))
      .finally(() => setLoading(false));
  }, []);

  const isExportTab = activeTab === "export";

  // Load on tab switch or initial mount — skip for the export tab
  useEffect(() => {
    if (!isExportTab) fetchReport(activeTab, from, to);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab) {
    setActiveTab(tab);
  }

  function handleApply(f, t) {
    if (!isExportTab) fetchReport(activeTab, f, t);
  }

  const ReportComponent = REPORT_COMPONENTS[activeTab];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: "16px" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn${activeTab === tab.key ? " active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <DateRangeBar
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onApply={handleApply}
      />

      {/* Content */}
      <div style={{ marginTop: "16px" }}>
        {isExportTab ? (
          <ExportTab from={from} to={to} />
        ) : (
          <>
            {loading && <PageLoader text="Loading report…" />}
            {error && !loading && (
              <p className="form-error" style={{ marginBottom: "12px" }}>{error}</p>
            )}
            {!loading && !error && (
              <ReportComponent rows={rows} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
