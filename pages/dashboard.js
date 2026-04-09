import { useState, useEffect } from "react";
import PageLoader from "../components/ui/PageLoader";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n)  { return parseFloat(n || 0).toFixed(2); }
function fmtK(n) {
  const v = parseFloat(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
}

function fmtTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

const STATUS_STYLE = {
  pending:   { background: "#FEF3C7", color: "#92400E" },
  preparing: { background: "#DBEAFE", color: "#1E40AF" },
  ready:     { background: "#F5F3FF", color: "#7C3AED" },
  completed: { background: "#DCFCE7", color: "#166534" },
  cancelled: { background: "#F3F4F6", color: "#9CA3AF" },
};

const PAY_STYLE = {
  paid:     { background: "#DCFCE7", color: "#166534" },
  refunded: { background: "#FEF2F2", color: "#EF4444" },
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="dash-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="dash-card-icon" style={{ color: accent, background: `${accent}18` }}>
        {icon}
      </div>
      <div className="dash-card-body">
        <p className="dash-card-label">{label}</p>
        <p className="dash-card-value">{value}</p>
        {sub && <p className="dash-card-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Finance card (Today / Monthly pair) ───────────────────────────────────────
// Slightly richer card used in the Financial Summary section.
// Shows expenses + profit side-by-side within one card per period.

function FinanceCard({ period, expenses, profit, revenue }) {
  const isProfit    = parseFloat(profit) >= 0;
  const profitColor = isProfit ? "#22C55E" : "#EF4444";
  const profitBg    = isProfit ? "#F0FDF4" : "#FEF2F2";
  const margin      = parseFloat(revenue) > 0
    ? `${((parseFloat(profit) / parseFloat(revenue)) * 100).toFixed(1)}% margin`
    : null;

  return (
    <div className="dash-finance-card">
      <p className="dash-finance-period">{period}</p>
      <div className="dash-finance-row">
        {/* Expenses */}
        <div className="dash-finance-col">
          <p className="dash-finance-label">Expenses</p>
          <p className="dash-finance-amount" style={{ color: "#F59E0B" }}>
            Rs.&nbsp;{fmtK(expenses)}
          </p>
        </div>

        <div className="dash-finance-divider" />

        {/* Profit / Loss */}
        <div className="dash-finance-col" style={{ background: profitBg, borderRadius: 8, padding: "10px 14px" }}>
          <p className="dash-finance-label" style={{ color: profitColor }}>
            {isProfit ? "Est. Profit" : "Est. Loss"}
          </p>
          <p className="dash-finance-amount" style={{ color: profitColor }}>
            {isProfit ? "+" : "−"}&nbsp;Rs.&nbsp;{fmtK(Math.abs(parseFloat(profit)))}
          </p>
          {margin && (
            <p className="dash-finance-sub">{margin}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ label }) {
  return (
    <div className="dash-section-divider">
      <span className="dash-section-divider-label">{label}</span>
    </div>
  );
}

// ── Hourly bar chart (CSS only, no library) ───────────────────────────────────

function HourlyChart({ data }) {
  const hours  = Array.from({ length: 18 }, (_, i) => i + 6);
  const byHour = {};
  for (const d of data) byHour[d.hour] = d;
  const maxRev = Math.max(...data.map((d) => parseFloat(d.revenue || 0)), 1);

  return (
    <div className="dash-chart-wrap">
      <p className="dash-section-title">Today's Hourly Revenue</p>
      <div className="dash-chart">
        {hours.map((h) => {
          const row     = byHour[h];
          const rev     = row ? parseFloat(row.revenue || 0) : 0;
          const pct     = Math.round((rev / maxRev) * 100);
          const label12 = h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`;
          return (
            <div
              key={h}
              className="dash-bar-col"
              title={rev > 0 ? `Rs. ${fmt(rev)} (${row?.order_count} orders)` : "No orders"}
            >
              <div className="dash-bar-outer">
                <div
                  className="dash-bar-inner"
                  style={{ height: `${pct}%`, background: rev > 0 ? "#EF476F" : "#E5E7EB" }}
                />
              </div>
              <span className="dash-bar-label">{label12}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Today's product sales ─────────────────────────────────────────────────────

const PRODUCT_ACCENTS = [
  "#EF476F", "#7C3AED", "#3B82F6", "#22C55E",
  "#F59E0B", "#06B6D4", "#EC4899", "#84CC16",
];

function TodayProductSales({ rows }) {
  if (rows.length === 0) {
    return (
      <p style={{ color: "#bbb", fontSize: "14px", marginBottom: "28px" }}>
        No paid orders yet today.
      </p>
    );
  }

  return (
    <div className="dash-cards-sm">
      {rows.map((r, i) => {
        const name   = r.variant_name
          ? `${r.product_name} — ${r.variant_name}`
          : r.product_name;
        const qty    = parseInt(r.total_qty || 0);
        const rev    = parseFloat(r.total_revenue || 0);
        const accent = PRODUCT_ACCENTS[i % PRODUCT_ACCENTS.length];
        return (
          <StatCard
            key={i}
            label={name}
            value={qty}
            sub={`Rs. ${fmt(rev)} revenue`}
            accent={accent}
            icon={String(i + 1)}
          />
        );
      })}
    </div>
  );
}

// ── Recent orders table ───────────────────────────────────────────────────────

function RecentOrders({ orders }) {
  return (
    <div className="dash-chart-wrap" style={{ padding: "20px 0 0" }}>
      <p className="dash-section-title" style={{ padding: "0 24px" }}>Recent Orders</p>
      <div
        className="table-container"
        style={{ borderRadius: 0, border: "none", boxShadow: "none", borderTop: "1px solid #ebebeb" }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Time</th>
              <th>Cashier</th>
              <th>Type</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#bbb", padding: "24px" }}>
                  No orders yet today.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700, color: "#111827" }}>{o.order_number}</td>
                  <td style={{ color: "#6B7280", fontSize: "13px" }}>{fmtTime(o.created_at)}</td>
                  <td style={{ color: "#555" }}>{o.cashier_name || "—"}</td>
                  <td>
                    <span
                      className="badge"
                      style={
                        o.type === "dine-in"
                          ? { background: "#EFF6FF", color: "#3B82F6" }
                          : o.type === "delivery"
                          ? { background: "#f3f0ff", color: "#7048e8" }
                          : { background: "#fff8f0", color: "#e67700" }
                      }
                    >
                      {o.type === "dine-in" ? "Dine In" : o.type === "delivery" ? "Delivery" : "Takeaway"}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "#111827" }}>Rs. {fmt(o.total)}</td>
                  <td>
                    {o.payment_status ? (
                      <span className="badge" style={PAY_STYLE[o.payment_status]}>
                        {o.payment_method} / {o.payment_status}
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    <span className="badge" style={STATUS_STYLE[o.status]}>{o.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (error)   return <div className="placeholder-page"><p className="form-error">{error}</p></div>;

  const { stats, hourly, recentOrders, todaySales, monthlySales } = data;

  const todayProfitIsPos   = parseFloat(stats.today_profit)   >= 0;
  const monthlyProfitIsPos = parseFloat(stats.monthly_profit) >= 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          })}
        </span>
      </div>

      {/* ── Operations cards (7) ── */}
      <div className="dash-cards">
        <StatCard
          label="Today's Revenue"
          value={`Rs. ${fmtK(stats.today_revenue)}`}
          sub="Today's paid orders"
          accent="#EF476F"
          icon="₨"
        />
        <StatCard
          label="Monthly Revenue"
          value={`Rs. ${fmtK(stats.monthly_revenue)}`}
          sub="This month"
          accent="#7C3AED"
          icon="📅"
        />
        <StatCard
          label="Total Orders"
          value={parseInt(stats.total_orders)}
          sub="Today"
          accent="#3B82F6"
          icon="#"
        />
        <StatCard
          label="Paid Orders"
          value={parseInt(stats.paid_orders)}
          sub={`${
            parseInt(stats.total_orders) > 0
              ? Math.round((parseInt(stats.paid_orders) / parseInt(stats.total_orders)) * 100)
              : 0
          }% of today's orders`}
          accent="#22C55E"
          icon="✓"
        />
        <StatCard
          label="Unpaid Bills"
          value={stats.unpaid_bills}
          sub="Pending payment"
          accent="#F59E0B"
          icon="⚠"
        />
        <StatCard
          label="Avg Order Value"
          value={`Rs. ${fmt(stats.avg_order_value)}`}
          sub="Today's paid orders"
          accent="#3B82F6"
          icon="~"
        />
        <StatCard
          label="Kitchen Queue"
          value={stats.kitchen_pending}
          sub={stats.kitchen_pending > 0 ? "Orders pending/preparing" : "All clear"}
          accent={stats.kitchen_pending > 0 ? "#F59E0B" : "#22C55E"}
          icon="🍳"
        />
      </div>

      {/* ── Financial Summary section ── */}
      <SectionDivider label="Financial Summary" />

      <div className="dash-finance-grid">
        <FinanceCard
          period="Today"
          expenses={stats.today_expenses}
          profit={stats.today_profit}
          revenue={stats.today_revenue}
        />
        <FinanceCard
          period="This Month"
          expenses={stats.monthly_expenses}
          profit={stats.monthly_profit}
          revenue={stats.monthly_revenue}
        />
      </div>

      {/* ── Today's product sales ── */}
      <SectionDivider label="Today's Product Sales" />
      <TodayProductSales rows={todaySales} />

      {/* ── Monthly product sales ── */}
      <SectionDivider label="This Month's Product Sales" />
      <TodayProductSales rows={monthlySales} />

      {/* ── Hourly chart ── */}
      <HourlyChart data={hourly} />

      {/* ── Recent orders ── */}
      <RecentOrders orders={recentOrders} />
    </div>
  );
}
