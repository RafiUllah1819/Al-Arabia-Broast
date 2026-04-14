import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import PageLoader from "../components/ui/PageLoader";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const TYPE_STYLE = {
  "dine-in":  { background: "#EFF6FF", color: "#3B82F6" },
  "takeaway": { background: "#FFF7ED", color: "#F59E0B" },
  "delivery": { background: "#DCFCE7", color: "#22C55E" },
};
const TYPE_LABEL = { "dine-in": "Dine In", "takeaway": "Takeaway", "delivery": "Delivery" };

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

// ── Order Detail Modal ────────────────────────────────────────────────────────

function OrderDetailModal({ orderId, onClose, onCancelled }) {
  const { user }     = useAuth();
  const canCancel    = user?.role === "admin" || user?.role === "manager";
  const [order,      setOrder]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/orders/detail?id=${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setOrder(data.order);
      })
      .catch(() => setError("Failed to load order."))
      .finally(() => setLoading(false));
  }, [orderId]);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-lg"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            {order ? order.order_number : "Order Details"}
            {order && (
              <span
                className="badge"
                style={{ ...STATUS_STYLE[order.status], marginLeft: "10px", fontSize: "11px" }}
              >
                {order.status}
              </span>
            )}
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
          {loading && <PageLoader />}
          {error   && <p className="form-error">{error}</p>}

          {order && (
            <>
              {/* Meta */}
              <div className="order-meta-grid">
                <div className="order-meta-item">
                  <span className="order-meta-label">Date</span>
                  <span className="order-meta-value">{fmtDate(order.created_at)}</span>
                </div>
                <div className="order-meta-item">
                  <span className="order-meta-label">Time</span>
                  <span className="order-meta-value">{fmtTime(order.created_at)}</span>
                </div>
                <div className="order-meta-item">
                  <span className="order-meta-label">Type</span>
                  <span className="badge" style={TYPE_STYLE[order.type]}>
                    {TYPE_LABEL[order.type] || order.type}
                  </span>
                </div>
                <div className="order-meta-item">
                  <span className="order-meta-label">Cashier</span>
                  <span className="order-meta-value">{order.cashier_name || "—"}</span>
                </div>
                {(order.table_name || order.table_number) && (
                  <div className="order-meta-item">
                    <span className="order-meta-label">Table</span>
                    <span className="order-meta-value">{order.table_name || order.table_number}</span>
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
              </div>

              {/* Items */}
              <div>
                <p className="order-section-label">Items</p>
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
                                <span style={{ color: "#888", fontWeight: 400 }}>
                                  {" "}({item.variant_name})
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "center", color: "#555" }}>{item.quantity}</td>
                            <td style={{ textAlign: "right" }}>Rs. {item.unit_price.toFixed(2)}</td>
                            <td style={{ textAlign: "right", fontWeight: 500 }}>
                              Rs. {(item.line_total + addonTotal * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                          {item.addons.map((a, ai) => (
                            <tr key={`addon-${idx}-${ai}`} style={{ background: "#fafafa" }}>
                              <td style={{ paddingLeft: "28px", fontSize: "12px", color: "#888" }}>
                                + {a.name}
                              </td>
                              <td style={{ textAlign: "center", fontSize: "12px", color: "#aaa" }}>
                                {item.quantity}
                              </td>
                              <td style={{ textAlign: "right", fontSize: "12px", color: "#888" }}>
                                +Rs. {a.price.toFixed(2)}
                              </td>
                              <td style={{ textAlign: "right", fontSize: "12px", color: "#888" }}>
                                +Rs. {(a.price * item.quantity).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="order-totals-box">
                <div className="order-totals-row">
                  <span>Subtotal</span>
                  <span>Rs. {parseFloat(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="order-totals-row grand">
                  <span>Total</span>
                  <span>Rs. {parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment */}
              <div>
                <p className="order-section-label">Payment</p>
                <div className="order-payment-box">
                  <div className="order-payment-row">
                    <span>Method</span>
                    <span style={{ textTransform: "capitalize", fontWeight: 500 }}>
                      {order.payment_method || "—"}
                    </span>
                  </div>
                  <div className="order-payment-row">
                    <span>Amount Paid</span>
                    <span>Rs. {parseFloat(order.payment_amount || 0).toFixed(2)}</span>
                  </div>
                  {order.payment_method === "cash" && parseFloat(order.change_due || 0) > 0 && (
                    <div className="order-payment-row">
                      <span>Change Given</span>
                      <span>Rs. {parseFloat(order.change_due).toFixed(2)}</span>
                    </div>
                  )}
                  {order.payment_reference && (
                    <div className="order-payment-row">
                      <span>Reference</span>
                      <span style={{ color: "#888", fontSize: "12px" }}>
                        {order.payment_reference}
                      </span>
                    </div>
                  )}
                  <div className="order-payment-row">
                    <span>Status</span>
                    {order.payment_status ? (
                      <span className="badge" style={PAY_STYLE[order.payment_status]}>
                        {order.payment_status}
                      </span>
                    ) : (
                      <span style={{ color: "#aaa", fontSize: "12px" }}>No payment</span>
                    )}
                  </div>
                </div>
              </div>

              {order.notes && (
                <div>
                  <p className="order-section-label">Notes</p>
                  <p style={{ fontSize: "13px", color: "#555", background: "#fafafa", padding: "10px 12px", borderRadius: "6px", border: "1px solid #eee" }}>
                    {order.notes}
                  </p>
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === "admin" || user?.role === "manager";

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [selectedId,  setSelectedId]  = useState(null);
  const [clearing,    setClearing]    = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [payFilter,  setPayFilter]  = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (dateFilter) params.set("date",           dateFilter);
    if (payFilter)  params.set("payment_status", payFilter);
    if (typeFilter) params.set("order_type",     typeFilter);

    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setOrders(data.orders || []);
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, [dateFilter, payFilter, typeFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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

  const shownTotal = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          Orders
          {!isAdmin && (
            <span style={{ fontSize: "13px", fontWeight: 400, color: "#888", marginLeft: "10px" }}>
              (your orders only)
            </span>
          )}
        </h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={fetchOrders}>Refresh</button>
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
          <button
            className={`tab-btn${dateFilter === "today" ? " active" : ""}`}
            style={{ marginBottom: 0 }}
            onClick={() => setDateFilter("today")}
          >
            Today
          </button>
          <button
            className={`tab-btn${dateFilter === "" ? " active" : ""}`}
            style={{ marginBottom: 0 }}
            onClick={() => setDateFilter("")}
          >
            All Time
          </button>
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
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      {!loading && !error && (
        <p className="orders-summary">
          <strong>{orders.length}</strong> order{orders.length !== 1 ? "s" : ""}
          <span style={{ color: "#ddd", margin: "0 8px" }}>|</span>
          Total: <strong>Rs. {shownTotal.toFixed(2)}</strong>
        </p>
      )}

      {error && <p className="form-error" style={{ marginBottom: "12px" }}>{error}</p>}

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <PageLoader />
        ) : (
          <table className="data-table orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date / Time</th>
                <th>Type</th>
                {isAdmin && <th>Cashier</th>}
                <th className="col-hide-mobile">Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th className="col-hide-mobile">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
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
                  {isAdmin && (
                    <td style={{ color: "#555", fontSize: "13px" }}>{o.cashier_name || "—"}</td>
                  )}
                  <td className="col-hide-mobile" style={{ color: "#888" }}>
                    {o.item_count} item{o.item_count !== 1 ? "s" : ""}
                  </td>
                  <td style={{ fontWeight: 600 }}>Rs. {parseFloat(o.total).toFixed(2)}</td>
                  <td>
                    {o.payment_status ? (
                      <>
                        <span className="badge" style={PAY_STYLE[o.payment_status]}>
                          {o.payment_status}
                        </span>
                        <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px", textTransform: "capitalize" }}>
                          {o.payment_method}
                        </div>
                      </>
                    ) : (
                      <span style={{ color: "#aaa", fontSize: "12px" }}>—</span>
                    )}
                  </td>
                  <td className="col-hide-mobile">
                    <span className="badge" style={STATUS_STYLE[o.status]}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
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
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 9 : 8}
                    style={{ textAlign: "center", color: "#bbb", padding: "40px" }}
                  >
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && (
        <OrderDetailModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onCancelled={(id) => {
            setOrders((prev) =>
              prev.map((o) => o.id === id ? { ...o, status: "cancelled" } : o)
            );
          }}
        />
      )}
    </div>
  );
}
