import { useState, useEffect } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n)     { return parseFloat(n || 0).toFixed(2); }
function fmtK(n)    { const v = parseFloat(n || 0); return v >= 1000 ? `${(v/1000).toFixed(1)}k` : fmt(v); }

function fmtTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

const STATUS_STYLE = {
  pending:   { background: "#fff9db", color: "#e67700" },
  preparing: { background: "#e8f4fd", color: "#1971c2" },
  ready:     { background: "#f3f0ff", color: "#7048e8" },
  completed: { background: "#f0fff4", color: "#2f9e44" },
  cancelled: { background: "#f5f5f5", color: "#aaa"   },
};

const PAY_STYLE = {
  paid:     { background: "#f0fff4", color: "#2f9e44" },
  refunded: { background: "#fff3f3", color: "#e03131" },
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="dash-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="dash-card-icon" style={{ color: accent, background: `${accent}18` }}>{icon}</div>
      <div className="dash-card-body">
        <p className="dash-card-label">{label}</p>
        <p className="dash-card-value" style={{ color: accent === "#e94560" ? "#1a1a2e" : "#1a1a2e" }}>{value}</p>
        {sub && <p className="dash-card-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Hourly bar chart (CSS only, no library) ───────────────────────────────────

function HourlyChart({ data }) {
  // Fill all business hours 6-23 even if no orders that hour
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);
  const byHour = {};
  for (const d of data) byHour[d.hour] = d;

  const maxRev = Math.max(...data.map((d) => parseFloat(d.revenue || 0)), 1);

  return (
    <div className="dash-chart-wrap">
      <p className="dash-section-title">Today's Hourly Revenue</p>
      <div className="dash-chart">
        {hours.map((h) => {
          const row = byHour[h];
          const rev = row ? parseFloat(row.revenue || 0) : 0;
          const pct = Math.round((rev / maxRev) * 100);
          const label12 = h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`;
          return (
            <div key={h} className="dash-bar-col" title={rev > 0 ? `Rs. ${fmt(rev)} (${row?.order_count} orders)` : "No orders"}>
              <div className="dash-bar-outer">
                <div
                  className="dash-bar-inner"
                  style={{ height: `${pct}%`, background: rev > 0 ? "#e94560" : "#eee" }}
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

// ── Recent orders table ───────────────────────────────────────────────────────

function RecentOrders({ orders }) {
  return (
    <div className="dash-chart-wrap" style={{ padding: "20px 0 0" }}>
      <p className="dash-section-title" style={{ padding: "0 24px" }}>Recent Orders</p>
      <div className="table-container" style={{ borderRadius: 0, border: "none", boxShadow: "none", borderTop: "1px solid #ebebeb" }}>
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
                  <td style={{ fontWeight: 700, color: "#1a1a2e" }}>{o.order_number}</td>
                  <td style={{ color: "#9aa3b2", fontSize: "13px" }}>{fmtTime(o.created_at)}</td>
                  <td style={{ color: "#555" }}>{o.cashier_name || "—"}</td>
                  <td>
                    <span className="badge" style={
                      o.type === "dine-in"
                        ? { background: "#f0f4ff", color: "#3b5bdb" }
                        : o.type === "delivery"
                        ? { background: "#f3f0ff", color: "#7048e8" }
                        : { background: "#fff8f0", color: "#e67700" }
                    }>
                      {o.type === "dine-in" ? "Dine In" : o.type === "delivery" ? "Delivery" : "Takeaway"}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "#1a1a2e" }}>Rs. {fmt(o.total)}</td>
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

  if (loading) return <div className="placeholder-page"><p style={{ color: "#999" }}>Loading...</p></div>;
  if (error)   return <div className="placeholder-page"><p className="form-error">{error}</p></div>;

  const { stats, hourly, recentOrders } = data;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ fontSize: "13px", color: "#9aa3b2", fontWeight: 500 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="dash-cards">
        <StatCard
          label="Today's Revenue"
          value={`Rs. ${fmtK(stats.today_revenue)}`}
          sub={`Avg Rs. ${fmt(stats.avg_order_value)} / order`}
          accent="#e94560"
          icon="₨"
        />
        <StatCard
          label="Total Orders"
          value={parseInt(stats.total_orders)}
          sub="Today"
          accent="#3b5bdb"
          icon="#"
        />
        <StatCard
          label="Paid Orders"
          value={parseInt(stats.paid_orders)}
          sub={`${parseInt(stats.total_orders) > 0 ? Math.round((parseInt(stats.paid_orders) / parseInt(stats.total_orders)) * 100) : 0}% of today's orders`}
          accent="#2f9e44"
          icon="✓"
        />
        <StatCard
          label="Kitchen Queue"
          value={stats.kitchen_pending}
          sub={stats.kitchen_pending > 0 ? "Orders pending/preparing" : "All clear"}
          accent={stats.kitchen_pending > 0 ? "#e67700" : "#2f9e44"}
          icon="🍳"
        />
      </div>

      {/* Hourly chart */}
      <HourlyChart data={hourly} />

      {/* Recent orders */}
      <RecentOrders orders={recentOrders} />
    </div>
  );
}
