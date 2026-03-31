import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { printReceipt } from "../lib/receipt";

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

const TYPE_STYLE = {
  "dine-in":  { background: "#f0f4ff", color: "#3b5bdb" },
  "takeaway": { background: "#fff8f0", color: "#e67700" },
  "delivery": { background: "#f3fff3", color: "#2f9e44" },
};
const TYPE_LABEL = { "dine-in": "Dine In", "takeaway": "Takeaway", "delivery": "Delivery" };

const PAY_STYLE = {
  paid:     { background: "#f0fff4", color: "#2f9e44" },
  refunded: { background: "#fff3f3", color: "#e03131" },
};

const STATUS_STYLE = {
  pending:   { background: "#fff9db", color: "#e67700" },
  preparing: { background: "#e8f4fd", color: "#1971c2" },
  ready:     { background: "#f3f0ff", color: "#7048e8" },
  completed: { background: "#f0fff4", color: "#2f9e44" },
  cancelled: { background: "#f5f5f5", color: "#aaa"    },
};

// ── Collect Payment Modal ──────────────────────────────────────────────────────

function CollectPaymentModal({ order, onClose, onCollected }) {
  const [method,       setMethod]       = useState("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [cardRef,      setCardRef]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  const total    = parseFloat(order.total);
  const tendered = parseFloat(cashTendered) || 0;
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
          cashTendered:  method === "cash" ? tendered   : undefined,
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
      <div className="modal" style={{ width: "400px" }} onClick={(e) => e.stopPropagation()}>
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

function BillDetailModal({ orderId, settings, onClose }) {
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-lg"
        style={{ width: "560px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{order ? order.order_number : "Bill Details"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", flex: 1 }}>
          {loading && <p style={{ color: "#999" }}>Loading...</p>}
          {error   && <p className="form-error">{error}</p>}

          {order && (
            <>
              {/* Screen view */}
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
                  <span className="order-meta-label">Status</span>
                  <span className="badge" style={STATUS_STYLE[order.status]}>
                    {order.status}
                  </span>
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
                <div className="order-totals-row grand"><span>Total</span><span>Rs. {parseFloat(order.total).toFixed(2)}</span></div>
              </div>

              {/* Payment */}
              <p className="order-section-label" style={{ marginTop: "16px" }}>Payment</p>
              <div className="order-payment-box">
                <div className="order-payment-row">
                  <span>Method</span>
                  <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{order.payment_method || "—"}</span>
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
                    <span style={{ color: "#888", fontSize: "12px" }}>{order.payment_reference}</span>
                  </div>
                )}
                <div className="order-payment-row">
                  <span>Status</span>
                  {order.payment_status ? (
                    <span className="badge" style={PAY_STYLE[order.payment_status]}>{order.payment_status}</span>
                  ) : (
                    <span style={{ color: "#aaa", fontSize: "12px" }}>No payment</span>
                  )}
                </div>
              </div>

            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {order && (
            <button className="btn btn-primary" onClick={handlePrint}>🖨 Print Bill</button>
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

  const [orders,     setOrders]     = useState([]);
  const [settings,   setSettings]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [selectedId,     setSelectedId]     = useState(null);
  const [collectingOrder, setCollectingOrder] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [typeFilter, setTypeFilter] = useState("");
  const [payFilter,  setPayFilter]  = useState("");

  // Load settings once for receipt printing
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

  const total = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);

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
        <button className="btn btn-secondary" onClick={fetchBills}>Refresh</button>
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

      {!loading && !error && (
        <p className="orders-summary">
          <strong>{orders.length}</strong> bill{orders.length !== 1 ? "s" : ""}
          <span style={{ color: "#ddd", margin: "0 8px" }}>|</span>
          Total: <strong>Rs. {total.toFixed(2)}</strong>
        </p>
      )}

      {error && <p className="form-error" style={{ marginBottom: "12px" }}>{error}</p>}

      <div className="table-container">
        {loading ? (
          <p style={{ padding: "24px", color: "#999" }}>Loading...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Date / Time</th>
                <th>Type</th>
                <th>Table</th>
                <th>Waiter</th>
                {isAdmin && <th>Cashier</th>}
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
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
                  <td style={{ color: "#555", fontSize: "13px" }}>{o.table_name || "—"}</td>
                  <td style={{ color: "#555", fontSize: "13px" }}>{o.waiter_name || "—"}</td>
                  {isAdmin && <td style={{ color: "#555", fontSize: "13px" }}>{o.cashier_name || "—"}</td>}
                  <td style={{ color: "#888" }}>{o.item_count} item{o.item_count !== 1 ? "s" : ""}</td>
                  <td style={{ fontWeight: 600 }}>Rs. {parseFloat(o.total).toFixed(2)}</td>
                  <td>
                    {o.payment_status ? (
                      <>
                        <span className="badge" style={PAY_STYLE[o.payment_status]}>{o.payment_status}</span>
                        <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px", textTransform: "capitalize" }}>
                          {o.payment_method}
                        </div>
                      </>
                    ) : (
                      <span style={{ color: "#aaa", fontSize: "12px" }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={STATUS_STYLE[o.status]}>{o.status}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {!o.payment_status && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setCollectingOrder(o)}
                        >
                          Collect Payment
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setSelectedId(o.id)}
                      >
                        View / Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
