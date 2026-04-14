import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { printReceipt } from "../lib/receipt";
import PageLoader from "../components/ui/PageLoader";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return `${fmtDate(d)} ${fmtTime(d)}`;
}

// Order status (kitchen workflow)
const ORDER_STATUS_STYLE = {
  pending:   { background: "#FEF3C7", color: "#92400E" },
  preparing: { background: "#DBEAFE", color: "#1E40AF" },
  ready:     { background: "#F5F3FF", color: "#7C3AED" },
  completed: { background: "#DCFCE7", color: "#166534" },
  cancelled: { background: "#F3F4F6", color: "#9CA3AF" },
};
const ORDER_STATUS_LABEL = {
  pending:   "Pending",
  preparing: "Preparing",
  ready:     "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Payment status
const PAY_STYLE = {
  paid:     { background: "#DCFCE7", color: "#166534" },
  unpaid:   { background: "#FEF2F2", color: "#EF4444" },
  refunded: { background: "#FEF3C7", color: "#92400E" },
};

const TYPE_STYLE = {
  "dine-in":  { background: "#EFF6FF", color: "#3B82F6" },
  "takeaway": { background: "#FFF7ED", color: "#F59E0B" },
  "delivery": { background: "#DCFCE7", color: "#22C55E" },
};
const TYPE_LABEL = { "dine-in": "Dine In", "takeaway": "Takeaway", "delivery": "Delivery" };

/** Returns a clear payment label like "Paid · Cash", "Unpaid", "Refunded" */
function paymentLabel(o) {
  if (!o.payment_status) return { label: "Unpaid", style: PAY_STYLE.unpaid };
  if (o.payment_status === "paid") {
    const method = o.payment_method
      ? ` · ${o.payment_method.charAt(0).toUpperCase() + o.payment_method.slice(1)}`
      : "";
    return { label: `Paid${method}`, style: PAY_STYLE.paid };
  }
  if (o.payment_status === "refunded") return { label: "Refunded", style: PAY_STYLE.refunded };
  return { label: o.payment_status, style: {} };
}

/** Table display: prefer joined table name, fall back to table_number, else "—" */
function tableDisplay(o) {
  if (o.table_name)   return o.table_name;
  if (o.table_number) return `#${o.table_number}`;
  return "—";
}

// ── Collect Payment Modal ──────────────────────────────────────────────────────

function CollectPaymentModal({ order, onClose, onCollected }) {
  const [method,       setMethod]       = useState("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [cardRef,      setCardRef]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  const total     = parseFloat(order.total);
  const tendered  = parseFloat(cashTendered) || 0;
  const changeDue = method === "cash" ? tendered - total : 0;

  async function handleConfirm() {
    if (method === "cash" && tendered < total) {
      setError(`Cash received must be at least Rs. ${total.toFixed(2)}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res  = await fetch("/api/orders/collect-payment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          orderId:       order.id,
          paymentMethod: method,
          cashTendered:  method === "cash" ? tendered      : undefined,
          cardReference: method === "card" ? cardRef.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to collect payment."); return; }
      onCollected(data.changeDue);
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
          <h3>Collect Payment — {order.order_number}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="pay-summary">
            <div className="pay-summary-row pay-total-row">
              <span>Amount Due</span>
              <span>Rs. {total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <p className="form-label" style={{ marginBottom: "8px" }}>Payment Method</p>
            <div className="pay-method-bar">
              {["cash", "card"].map((m) => (
                <button
                  key={m}
                  className={`pay-method-btn${method === m ? " active" : ""}`}
                  onClick={() => setMethod(m)}
                >
                  {m === "cash" ? "Cash" : "Card"}
                </button>
              ))}
            </div>
          </div>

          {method === "cash" && (
            <div className="form-group">
              <label className="form-label">Cash Received</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min={total.toFixed(2)}
                placeholder={`e.g. ${Math.ceil(total)}.00`}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                autoFocus
              />
              {tendered >= total && (
                <div className="pay-change">
                  Change: <strong>Rs. {changeDue.toFixed(2)}</strong>
                </div>
              )}
            </div>
          )}

          {method === "card" && (
            <div className="form-group">
              <label className="form-label">
                Reference <span className="form-hint">(optional)</span>
              </label>
              <input
                className="form-input"
                placeholder="Terminal receipt / transaction ID"
                value={cardRef}
                onChange={(e) => setCardRef(e.target.value)}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? "Processing…" : `Collect Rs. ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bill Detail Modal ──────────────────────────────────────────────────────────

function BillDetailModal({ orderId, settings, onClose, onCancelled, canCancel }) {
  const [order,      setOrder]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/detail?id=${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setOrder(data.order);
      })
      .catch(() => setError("Failed to load bill."))
      .finally(() => setLoading(false));
  }, [orderId]);

  function handlePrint() {
    if (!order) return;
    printReceipt(order, settings);
    onClose();
  }

  async function handleCancel() {
    if (!confirm(`Cancel order ${order.order_number}? This cannot be undone.`)) return;
    setCancelling(true);
    setError("");
    try {
      const res  = await fetch(`/api/orders/${orderId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to cancel order."); return; }
      setOrder((prev) => ({ ...prev, status: "cancelled" }));
      if (onCancelled) onCancelled(orderId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const pay = order ? paymentLabel(order) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-lg"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{order ? order.order_number : "Bill Details"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
          {loading && <PageLoader />}
          {error   && <p className="form-error">{error}</p>}

          {order && (
            <>
              <div className="order-meta-grid">
                <div className="order-meta-item">
                  <span className="order-meta-label">Date</span>
                  <span className="order-meta-value">{fmtDateTime(order.created_at)}</span>
                </div>
                <div className="order-meta-item">
                  <span className="order-meta-label">Type</span>
                  <span className="badge" style={TYPE_STYLE[order.type]}>
                    {TYPE_LABEL[order.type] || order.type}
                  </span>
                </div>
                {order.table_name && (
                  <div className="order-meta-item">
                    <span className="order-meta-label">Table</span>
                    <span className="order-meta-value">{order.table_name}</span>
                  </div>
                )}
                {order.waiter_name && (
                  <div className="order-meta-item">
                    <span className="order-meta-label">Waiter</span>
                    <span className="order-meta-value">{order.waiter_name}</span>
                  </div>
                )}
                {order.customer_name && (
                  <div className="order-meta-item">
                    <span className="order-meta-label">Customer</span>
                    <span className="order-meta-value">{order.customer_name}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div className="order-meta-item">
                    <span className="order-meta-label">Phone</span>
                    <span className="order-meta-value">{order.customer_phone}</span>
                  </div>
                )}
                {order.customer_address && (
                  <div className="order-meta-item" style={{ gridColumn: "1 / -1" }}>
                    <span className="order-meta-label">Delivery Address</span>
                    <span className="order-meta-value">{order.customer_address}</span>
                  </div>
                )}
                <div className="order-meta-item">
                  <span className="order-meta-label">Cashier</span>
                  <span className="order-meta-value">{order.cashier_name || "—"}</span>
                </div>
                <div className="order-meta-item">
                  <span className="order-meta-label">Order Status</span>
                  <span className="badge" style={ORDER_STATUS_STYLE[order.status]}>
                    {ORDER_STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <div className="order-meta-item">
                  <span className="order-meta-label">Payment</span>
                  <span className="badge" style={pay.style}>{pay.label}</span>
                </div>
              </div>

              {/* Items */}
              <p className="order-section-label" style={{ marginTop: "16px" }}>Items</p>
              <table className="data-table" style={{ marginTop: "6px" }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: "50px", textAlign: "center" }}>Qty</th>
                    <th style={{ width: "74px", textAlign: "right" }}>Unit</th>
                    <th style={{ width: "74px", textAlign: "right" }}>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => {
                    const addonTotal = item.addons.reduce((s, a) => s + a.price, 0);
                    return (
                      <>
                        <tr key={`item-${idx}`}>
                          <td style={{ fontWeight: 500 }}>
                            {item.product_name}
                            {item.variant_name && (
                              <span style={{ color: "#888", fontWeight: 400 }}> ({item.variant_name})</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>{item.quantity}</td>
                          <td style={{ textAlign: "right" }}>Rs. {item.unit_price.toFixed(2)}</td>
                          <td style={{ textAlign: "right", fontWeight: 500 }}>
                            Rs. {(item.line_total + addonTotal * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                        {(item.combo_contents || []).map((c, ci) => (
                          <tr key={`combo-${idx}-${ci}`} style={{ background: "#fafafa" }}>
                            <td style={{ paddingLeft: "28px", fontSize: "12px", color: "#7048e8" }}>
                              · {c.name}{c.quantity > 1 ? ` x${c.quantity}` : ""}
                            </td>
                            <td colSpan={3} />
                          </tr>
                        ))}
                        {item.addons.map((a, ai) => (
                          <tr key={`addon-${idx}-${ai}`} style={{ background: "#fafafa" }}>
                            <td style={{ paddingLeft: "28px", fontSize: "12px", color: "#888" }}>+ {a.name}</td>
                            <td style={{ textAlign: "center", fontSize: "12px", color: "#aaa" }}>{item.quantity}</td>
                            <td style={{ textAlign: "right", fontSize: "12px", color: "#888" }}>+Rs. {a.price.toFixed(2)}</td>
                            <td style={{ textAlign: "right", fontSize: "12px", color: "#888" }}>+Rs. {(a.price * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="order-totals-box">
                <div className="order-totals-row grand">
                  <span>Total</span>
                  <span>Rs. {parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment detail */}
              <p className="order-section-label" style={{ marginTop: "16px" }}>Payment</p>
              <div className="order-payment-box">
                <div className="order-payment-row">
                  <span>Status</span>
                  <span className="badge" style={pay.style}>{pay.label}</span>
                </div>
                {order.payment_method && (
                  <div className="order-payment-row">
                    <span>Method</span>
                    <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{order.payment_method}</span>
                  </div>
                )}
                {order.payment_amount && parseFloat(order.payment_amount) > 0 && (
                  <div className="order-payment-row">
                    <span>Amount Paid</span>
                    <span>Rs. {parseFloat(order.payment_amount).toFixed(2)}</span>
                  </div>
                )}
                {order.payment_method === "cash" && parseFloat(order.change_due || 0) > 0 && (
                  <div className="order-payment-row">
                    <span>Change Given</span>
                    <span>Rs. {parseFloat(order.change_due).toFixed(2)}</span>
                  </div>
                )}
                {order.payment_reference && (
                  <div className="order-payment-row">
                    <span>Reference</span>
                    <span style={{ color: "#888", fontSize: "12px" }}>{order.payment_reference}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {canCancel && order && order.status !== "cancelled" && order.status !== "completed" && (
            <button
              className="btn"
              style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {order && (
            <button className="btn btn-primary" onClick={handlePrint}>Print Bill</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Bills Page ────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin" || user?.role === "manager";

  const [orders,          setOrders]          = useState([]);
  const [settings,        setSettings]        = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [selectedId,      setSelectedId]      = useState(null);
  const [collectingOrder, setCollectingOrder] = useState(null);
  const [clearing,        setClearing]        = useState(false);
  const [cancellingId,    setCancellingId]    = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [typeFilter, setTypeFilter] = useState("");
  const [payFilter,  setPayFilter]  = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setSettings(d.settings); });
  }, []);

  const fetchBills = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (dateFilter) params.set("date",           dateFilter);
    if (typeFilter) params.set("order_type",     typeFilter);
    if (payFilter)  params.set("payment_status", payFilter);

    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setOrders(data.orders || []);
      })
      .catch(() => setError("Failed to load bills."))
      .finally(() => setLoading(false));
  }, [dateFilter, typeFilter, payFilter]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  async function handleCancelOrder(orderId, orderNumber) {
    if (!confirm(`Cancel order ${orderNumber}? This cannot be undone.`)) return;
    setCancellingId(orderId);
    setError("");
    try {
      const res  = await fetch(`/api/orders/${orderId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to cancel order."); return; }
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o)
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleClearData() {
    if (!confirm("This will permanently delete ALL orders, order items, and payments. Tables will be reset to available.\n\nAre you sure?")) return;
    setClearing(true);
    setError("");
    try {
      const res  = await fetch("/api/admin/clear-data", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to clear data."); return; }
      setOrders([]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setClearing(false);
    }
  }

  // Summary stats
  const stats = useMemo(() => {
    const totalBills  = orders.length;
    const paidAmount  = orders
      .filter((o) => o.payment_status === "paid")
      .reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const unpaidAmount = orders
      .filter((o) => !o.payment_status && o.status !== "cancelled")
      .reduce((s, o) => s + parseFloat(o.total || 0), 0);
    return { totalBills, paidAmount, unpaidAmount };
  }, [orders]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          Bills
          {!isAdmin && (
            <span style={{ fontSize: "13px", fontWeight: 400, color: "#888", marginLeft: "10px" }}>
              (your bills only)
            </span>
          )}
        </h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={fetchBills}>Refresh</button>
          {user?.role === "admin" && (
            <button
              className="btn"
              style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
              onClick={handleClearData}
              disabled={clearing}
            >
              {clearing ? "Clearing..." : "Clear All Data"}
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="orders-filter-bar">
        <div className="orders-filter-group">
          {[["today", "Today"], ["", "All Time"]].map(([val, label]) => (
            <button
              key={val}
              className={`tab-btn${dateFilter === val ? " active" : ""}`}
              style={{ marginBottom: 0 }}
              onClick={() => setDateFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="orders-filter-group">
          <select
            className="form-input orders-filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="dine-in">Dine In</option>
            <option value="takeaway">Takeaway</option>
            <option value="delivery">Delivery</option>
          </select>
          <select
            className="form-input orders-filter-select"
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && !error && (
        <div className="bills-summary-bar">
          <div className="bills-stat">
            <span className="bills-stat-label">Total Bills</span>
            <span className="bills-stat-value">{stats.totalBills}</span>
          </div>
          <div className="bills-stat-divider" />
          <div className="bills-stat">
            <span className="bills-stat-label">Paid</span>
            <span className="bills-stat-value" style={{ color: "#22C55E" }}>
              Rs. {stats.paidAmount.toFixed(2)}
            </span>
          </div>
          <div className="bills-stat-divider" />
          <div className="bills-stat">
            <span className="bills-stat-label">Unpaid</span>
            <span className="bills-stat-value" style={{ color: stats.unpaidAmount > 0 ? "#EF4444" : "#9CA3AF" }}>
              Rs. {stats.unpaidAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {error && <p className="form-error" style={{ marginBottom: "12px" }}>{error}</p>}

      <div className="table-container">
        {loading ? (
          <PageLoader />
        ) : (
          <table className="data-table payments-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Date / Time</th>
                <th>Type</th>
                <th className="col-hide-mobile">Table</th>
                <th className="col-hide-tablet">Waiter</th>
                {isAdmin && <th>Cashier</th>}
                <th className="col-hide-tablet">Items</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Payment</th>
                <th className="col-hide-mobile">Order</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const pay = paymentLabel(o);
                const canCollect = !o.payment_status && o.status !== "cancelled";
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                    <td>
                      <div style={{ fontSize: "12px", color: "#555" }}>{fmtDate(o.created_at)}</div>
                      <div style={{ fontSize: "11px", color: "#aaa" }}>{fmtTime(o.created_at)}</div>
                    </td>
                    <td>
                      <span className="badge" style={TYPE_STYLE[o.type] || {}}>
                        {TYPE_LABEL[o.type] || o.type}
                      </span>
                    </td>
                    <td className="col-hide-mobile" style={{ color: "#555", fontSize: "13px" }}>{tableDisplay(o)}</td>
                    <td className="col-hide-tablet" style={{ color: "#555", fontSize: "13px" }}>{o.waiter_name || "—"}</td>
                    {isAdmin && <td style={{ color: "#555", fontSize: "13px" }}>{o.cashier_name || "—"}</td>}
                    <td className="col-hide-tablet" style={{ color: "#888" }}>
                      {o.item_count} item{o.item_count !== 1 ? "s" : ""}
                    </td>
                    <td style={{ fontWeight: 600, textAlign: "right" }}>
                      Rs. {parseFloat(o.total).toFixed(2)}
                    </td>
                    <td>
                      <span className="badge" style={pay.style}>{pay.label}</span>
                    </td>
                    <td className="col-hide-mobile">
                      <span className="badge" style={ORDER_STATUS_STYLE[o.status]}>
                        {ORDER_STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="payments-actions-cell">
                      <div className="payments-actions-wrap" style={{ gap: "8px" }}>
                        {canCollect && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setCollectingOrder(o)}
                          >
                            Collect
                          </button>
                        )}
                        {isAdmin && o.status !== "cancelled" && o.status !== "completed" && (
                          <button
                            className="btn btn-sm"
                            style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
                            onClick={() => handleCancelOrder(o.id, o.order_number)}
                            disabled={cancellingId === o.id}
                          >
                            {cancellingId === o.id ? "..." : "Cancel"}
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedId(o.id)}
                        >
                          {o.payment_status === "paid" ? "Reprint" : "View"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 11 : 10}
                    style={{ textAlign: "center", color: "#bbb", padding: "40px" }}
                  >
                    No bills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && (
        <BillDetailModal
          key={selectedId}
          orderId={selectedId}
          settings={settings}
          onClose={() => setSelectedId(null)}
          canCancel={isAdmin}
          onCancelled={(id) => {
            setOrders((prev) =>
              prev.map((o) => o.id === id ? { ...o, status: "cancelled" } : o)
            );
          }}
        />
      )}

      {collectingOrder && (
        <CollectPaymentModal
          order={collectingOrder}
          onClose={() => setCollectingOrder(null)}
          onCollected={() => {
            setCollectingOrder(null);
            fetchBills();
          }}
        />
      )}
    </div>
  );
}
