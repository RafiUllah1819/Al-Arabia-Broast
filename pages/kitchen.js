import { useState, useEffect, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABEL = {
  "dine-in":  "Dine In",
  "takeaway": "Takeaway",
  "delivery": "Delivery",
};

const TYPE_COLOR = {
  "dine-in":  { bg: "#eef2ff", text: "#3b5bdb", border: "#3b5bdb" },
  "takeaway": { bg: "#fff8f0", text: "#e67700", border: "#e67700" },
  "delivery": { bg: "#f3f0ff", text: "#7048e8", border: "#7048e8" },
};

const STATUS_INFO = {
  pending:   { label: "New",       bg: "#fff9db", text: "#e67700" },
  preparing: { label: "Preparing", bg: "#e8f4fd", text: "#1971c2" },
  ready:     { label: "Ready",     bg: "#f0fff4", text: "#2f9e44" },
};

// Label on the complete button changes with current status
const COMPLETE_LABEL = {
  pending:   "Start",
  preparing: "Mark Ready",
  ready:     "Complete",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getElapsed(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)  return { text: `${secs}s`, mins: 0 };
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return { text: `${mins}m`, mins };
  const hrs  = Math.floor(mins / 60);
  return { text: `${hrs}h ${mins % 60}m`, mins };
}

function fmtTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ── Kitchen print slip ────────────────────────────────────────────────────────
//
// This is intentionally different from the customer receipt:
//   - No prices or totals
//   - Large order number for easy identification
//   - Quantity-first item layout optimised for kitchen use
//   - Notes displayed prominently in red
//   - "KITCHEN COPY" footer so it's never confused with a customer bill
//   - Thermal 80mm layout (same physical paper width)

function printKitchenTicket(order) {
  const typeLabel = TYPE_LABEL[order.type] || order.type;
  const tableInfo = order.table_number
    ? `Table ${order.table_number}`
    : order.customer_name || "";

  const itemsHtml = order.items.map((item) => {
    const variantPart = item.variant_name
      ? `<div class="var">(${item.variant_name})</div>` : "";
    const addonLines  = item.addons
      .map((a) => `<div class="addon">+ ${a}</div>`).join("");
    const noteLine    = item.notes
      ? `<div class="note">Note: ${item.notes}</div>` : "";
    return `
<div class="item">
  <span class="qty">${item.quantity}x</span>
  <div class="item-body">
    <div class="item-name">${item.product_name}</div>
    ${variantPart}${addonLines}${noteLine}
  </div>
</div>`;
  }).join("");

  const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>KDS — ${order.order_number}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  background: #e8e8e8;
  padding: 14px 10px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.print-btn {
  width: 264px;
  margin-bottom: 12px;
  padding: 8px 0;
  background: #fff;
  color: #222;
  border: 1.5px solid #333;
  border-radius: 4px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.print-btn:hover { background: #222; color: #fff; }
@page { size: 80mm auto; margin: 5mm 4mm; }
@media print {
  .print-btn { display: none; }
  body { background: white; padding: 0; margin: 0; display: block; }
  .slip { width: 100%; border: none; padding: 0; }
}
/* ── Slip wrapper ── */
.slip {
  width: 264px;
  background: white;
  padding: 14px 12px 16px;
  border: 1px solid #ccc;
  font-family: 'Courier New', Courier, monospace;
  line-height: 1.5;
}
.slip-label {
  text-align: center;
  font-size: 9px;
  letter-spacing: 3px;
  color: #aaa;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.order-num {
  text-align: center;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 1px;
  color: #111;
  margin-bottom: 5px;
  line-height: 1;
}
.sep       { border: none; border-top: 1px dashed #888; margin: 8px 0; }
.sep-solid { border: none; border-top: 1px solid #333;  margin: 8px 0; }
/* ── Meta ── */
.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  font-size: 11px;
  margin-bottom: 3px;
}
.meta-lbl { color: #888; flex-shrink: 0; min-width: 44px; }
.meta-val { font-weight: 600; text-align: right; }
/* ── Items ── */
.items-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #999;
  margin-bottom: 8px;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 9px;
}
.qty {
  font-size: 20px;
  font-weight: 900;
  color: #111;
  min-width: 32px;
  line-height: 1.1;
  padding-top: 1px;
  flex-shrink: 0;
}
.item-body { flex: 1; }
.item-name { font-size: 13px; font-weight: 700; color: #111; line-height: 1.3; }
.var       { font-size: 11px; color: #666; margin-top: 1px; }
.addon     { font-size: 11px; color: #555; padding-left: 6px; margin-top: 1px; }
.note      {
  font-size: 11px; font-weight: 700; color: #c00;
  padding: 2px 5px; margin-top: 3px;
  border: 1px dashed #c00; border-radius: 2px;
  display: inline-block;
}
/* ── Order-level note ── */
.order-note {
  text-align: center;
  font-size: 13px;
  font-weight: 900;
  color: #c00;
  padding: 6px 4px;
  border: 2px solid #c00;
  border-radius: 2px;
  letter-spacing: 0.3px;
  margin: 4px 0;
}
/* ── Footer ── */
.footer {
  text-align: center;
  font-size: 9px;
  color: #bbb;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 6px;
}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print Ticket</button>
<div class="slip">
  <div class="slip-label">K I T C H E N   T I C K E T</div>
  <div class="order-num">${order.order_number}</div>
  <div class="sep"></div>
  <div class="meta-row"><span class="meta-lbl">Type</span><span class="meta-val">${typeLabel}</span></div>
  ${tableInfo ? `<div class="meta-row"><span class="meta-lbl">Table</span><span class="meta-val">${tableInfo}</span></div>` : ""}
  ${order.waiter_name ? `<div class="meta-row"><span class="meta-lbl">Waiter</span><span class="meta-val">${order.waiter_name}</span></div>` : ""}
  <div class="meta-row"><span class="meta-lbl">Time</span><span class="meta-val">${fmtTime(order.created_at)}</span></div>
  <div class="sep-solid"></div>
  <div class="items-label">I T E M S</div>
  ${itemsHtml}
  ${order.notes ? `<div class="sep"></div><div class="order-note">!! ${order.notes} !!</div>` : ""}
  <div class="sep"></div>
  <div class="footer">Kitchen Copy — Do not give to customer</div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=340,height=640,scrollbars=yes");
  if (!win) { alert("Please allow popups to print kitchen tickets."); return; }
  win.document.write(doc);
  win.document.close();
  win.focus();
}

// ── Ticket card ───────────────────────────────────────────────────────────────

function Ticket({ order, onComplete, completing }) {
  const [elapsed, setElapsed] = useState(() => getElapsed(order.created_at));

  useEffect(() => {
    const t = setInterval(() => setElapsed(getElapsed(order.created_at)), 15_000);
    return () => clearInterval(t);
  }, [order.created_at]);

  const typeColor  = TYPE_COLOR[order.type]   || { bg: "#f5f5f5", text: "#555", border: "#ccc" };
  const statusInfo = STATUS_INFO[order.status] || STATUS_INFO.pending;
  const btnLabel   = COMPLETE_LABEL[order.status] || "Complete";
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const tableInfo  = order.table_number ? `Table ${order.table_number}` : null;

  // Urgency shifts left border color: type color → amber → red
  const borderColor = elapsed.mins >= 20 ? "#e03131"
    : elapsed.mins >= 10 ? "#f08c00"
    : typeColor.border;

  const elapsedClass = elapsed.mins >= 20 ? "kt-elapsed-high"
    : elapsed.mins >= 10 ? "kt-elapsed-medium"
    : "";

  return (
    <div className="kt-ticket" style={{ borderLeftColor: borderColor }}>

      {/* ── Header row: order number + status + elapsed ── */}
      <div className="kt-header">
        <div className="kt-header-left">
          <span className="kt-order-number">{order.order_number}</span>
          <span
            className="kt-status-badge"
            style={{ background: statusInfo.bg, color: statusInfo.text }}
          >
            {statusInfo.label}
          </span>
        </div>
        <div className="kt-header-right">
          <span className={`kt-elapsed ${elapsedClass}`}>{elapsed.text}</span>
          <span className="kt-time">{fmtTime(order.created_at)}</span>
        </div>
      </div>

      {/* ── Meta: type badge + table + item count ── */}
      <div className="kt-meta">
        <span
          className="kt-type-badge"
          style={{ background: typeColor.bg, color: typeColor.text }}
        >
          {TYPE_LABEL[order.type] || order.type}
        </span>
        {tableInfo && (
          <span className="kt-table-badge">{tableInfo}</span>
        )}
        {order.customer_name && !tableInfo && (
          <span className="kt-table-badge">{order.customer_name}</span>
        )}
        <span className="kt-item-count">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
      </div>

      {order.waiter_name && (
        <div className="kt-waiter">Waiter: {order.waiter_name}</div>
      )}

      {/* ── Items list ── */}
      <ul className="kt-items">
        {order.items.map((item, idx) => (
          <li key={idx} className="kt-item">
            <div className="kt-item-row">
              <span className="kt-item-qty">{item.quantity}×</span>
              <div className="kt-item-body">
                <span className="kt-item-name">
                  {item.product_name}
                  {item.variant_name && (
                    <span className="kt-variant"> ({item.variant_name})</span>
                  )}
                </span>
                {item.addons.length > 0 && (
                  <div className="kt-addons">
                    {item.addons.map((a, ai) => (
                      <span key={ai} className="kt-addon">+ {a}</span>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <div className="kt-item-note">{item.notes}</div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Order-level note ── */}
      {order.notes && (
        <div className="kt-order-note">{order.notes}</div>
      )}

      {/* ── Actions ── */}
      <div className="kt-actions">
        <button
          className="kt-btn-print"
          onClick={() => printKitchenTicket(order)}
        >
          Print
        </button>
        <button
          className="kt-btn-complete"
          disabled={completing}
          onClick={() => onComplete(order.id)}
        >
          {completing ? "…" : btnLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [completing,  setCompleting]  = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/kitchen")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setOrders(data.orders || []);
        setLastRefresh(new Date());
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, []);

  // Initial load
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const t = setInterval(fetchOrders, 30_000);
    return () => clearInterval(t);
  }, [fetchOrders]);

  async function handleComplete(orderId) {
    setCompleting((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res  = await fetch(`/api/kitchen/complete?id=${orderId}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to update order."); return; }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCompleting((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  const pending   = orders.filter((o) => o.status === "pending").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;
  const ready     = orders.filter((o) => o.status === "ready").length;

  return (
    <div className="kitchen-page">

      {/* ── Header ── */}
      <div className="kitchen-header">
        <div className="kitchen-header-left">
          <span className="kitchen-title">Kitchen Display</span>
          <div className="kitchen-stats">
            {pending   > 0 && <span className="kh-stat kh-stat-pending">{pending} New</span>}
            {preparing > 0 && <span className="kh-stat kh-stat-preparing">{preparing} Preparing</span>}
            {ready     > 0 && <span className="kh-stat kh-stat-ready">{ready} Ready</span>}
            {orders.length === 0 && !loading && (
              <span className="kh-stat kh-stat-clear">All Clear</span>
            )}
          </div>
        </div>
        <div className="kitchen-header-right">
          {error && <span className="kitchen-error">{error}</span>}
          {lastRefresh && !loading && (
            <span className="kitchen-refresh-hint">
              Updated {fmtTime(lastRefresh)}
            </span>
          )}
          <button
            className="kitchen-refresh-btn"
            onClick={fetchOrders}
            disabled={loading}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading && orders.length === 0 ? (
        <div className="kitchen-loading">
          <span className="kitchen-loading-dot" />
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="kitchen-empty">
          <div className="kitchen-empty-icon">✓</div>
          <div className="kitchen-empty-title">Kitchen is clear</div>
          <div className="kitchen-empty-sub">No active orders right now</div>
        </div>
      ) : (
        <div className="kitchen-grid">
          {orders.map((order) => (
            <Ticket
              key={order.id}
              order={order}
              completing={!!completing[order.id]}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
