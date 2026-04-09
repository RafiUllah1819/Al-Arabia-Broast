import { useState, useEffect, useMemo } from "react";
import ProductPickerModal from "../components/pos/ProductPickerModal";
import ComboPickerModal   from "../components/pos/ComboPickerModal";
import PaymentModal       from "../components/pos/PaymentModal";
import PageLoader from "../components/ui/PageLoader";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAgo(dateStr) {
  if (!dateStr) return null;
  const mins = Math.round((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m ago` : `${hrs}h ago`;
}

// ── Cart helpers ───────────────────────────────────────────────────────────────

let nextCartId = 1;

function cartItemKey(product, variant, addons) {
  const vKey = variant ? `v${variant.id}` : "v0";
  const aKey = addons.map((a) => `a${a.item_id}`).sort().join(",");
  return `${product.id}-${vKey}-${aKey}`;
}

function buildCartItem(product, variant, addons, quantity, unitPrice) {
  const label = variant ? `${product.name} (${variant.name})` : product.name;
  return {
    _cartId:       nextCartId++,
    key:           cartItemKey(product, variant, addons),
    productId:     product.id,
    productName:   product.name,
    variantId:     variant ? variant.id   : null,
    variantName:   variant ? variant.name : null,
    name:          label,
    addons,
    quantity,
    unitPrice,
    isKitchenItem: product.is_kitchen_item !== false,
  };
}

// ── Open-bill banner ───────────────────────────────────────────────────────────

function OpenBillBanner({ order }) {
  return (
    <div className="pos-open-bill-banner">
      <div className="pos-open-bill-dot" />
      <div className="pos-open-bill-info">
        <span className="pos-open-bill-number">{order.order_number}</span>
        <span className="pos-open-bill-total">Rs. {parseFloat(order.total).toFixed(2)} on bill</span>
      </div>
      <span className="pos-open-bill-badge">Open Bill</span>
    </div>
  );
}

// ── Table picker modal ─────────────────────────────────────────────────────────

const TABLE_STATUS_META = {
  available: { label: "Available", cls: "available" },
  occupied:  { label: "Occupied",  cls: "occupied"  },
  reserved:  { label: "Reserved",  cls: "reserved"  },
};

function TablePickerModal({ tables, onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="tbl-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tbl-picker-head">
          <div>
            <h3 className="tbl-picker-title">Select Table</h3>
            <p className="tbl-picker-sub">{tables.length} tables</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tbl-picker-grid">
          {tables.map((t) => {
            const hasOpenBill = !!t.order_id;
            const cardCls     = hasOpenBill ? "occupied" : (TABLE_STATUS_META[t.status]?.cls || "available");
            return (
              <button
                key={t.id}
                className={`tbl-card tbl-card-${cardCls}`}
                onClick={() => onSelect(t)}
              >
                <span className="tbl-card-name">{t.name}</span>
                <span className="tbl-card-seats">
                  <span className="tbl-seats-icon">⬜</span>{t.capacity} seats
                </span>
                {hasOpenBill ? (
                  <>
                    <span className="tbl-card-bill">
                      Rs. {parseFloat(t.bill_total || 0).toFixed(2)}
                    </span>
                    <div className="tbl-card-bill-meta">
                      {t.order_number && (
                        <span className="tbl-card-order-num">#{t.order_number}</span>
                      )}
                      {t.waiter_name && (
                        <span className="tbl-card-waiter">{t.waiter_name}</span>
                      )}
                    </div>
                    {fmtAgo(t.order_opened_at) && (
                      <span className="tbl-card-time">{fmtAgo(t.order_opened_at)}</span>
                    )}
                    <span className="tbl-card-badge tbl-badge-resume">Tap to Resume</span>
                  </>
                ) : (
                  <span className={`tbl-card-badge tbl-badge-${cardCls}`}>
                    {TABLE_STATUS_META[t.status]?.label || t.status}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="tbl-picker-legend">
          <span className="tbl-legend-item"><span className="tbl-legend-dot dot-available"/>Available</span>
          <span className="tbl-legend-item"><span className="tbl-legend-dot dot-occupied"/>Open Bill</span>
          <span className="tbl-legend-item"><span className="tbl-legend-dot dot-reserved"/>Reserved</span>
        </div>
      </div>
    </div>
  );
}

// ── Waiter picker modal ────────────────────────────────────────────────────────

function WaiterPickerModal({ staff, selectedWaiterId, onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="waiter-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tbl-picker-head">
          <h3 className="tbl-picker-title">Select Waiter</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="waiter-picker-list">
          <button
            className={`waiter-card${!selectedWaiterId ? " active" : ""}`}
            onClick={() => onSelect(null)}
          >
            <div className="waiter-card-avatar waiter-avatar-none">—</div>
            <span className="waiter-card-name">No waiter assigned</span>
          </button>
          {staff.map((s) => (
            <button
              key={s.id}
              className={`waiter-card${String(selectedWaiterId) === String(s.id) ? " active" : ""}`}
              onClick={() => onSelect(s)}
            >
              <div className="waiter-card-avatar">
                {s.name.charAt(0).toUpperCase()}
              </div>
              <span className="waiter-card-name">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Order context panel (below type selector) ──────────────────────────────────

function OrderContextPanel({
  orderType, ctx, onChange,
  selectedTable, selectedWaiter,
  onOpenTablePicker, onOpenWaiterPicker,
}) {
  if (orderType === "dine_in") {
    return (
      <div className="pos-context-panel">
        {/* Table picker */}
        <div className="pos-context-row">
          <label className="pos-context-label">Table</label>
          {selectedTable ? (
            <button className="pos-sel-card pos-sel-table" onClick={onOpenTablePicker}>
              <div className="pos-sel-info">
                <span className="pos-sel-name">{selectedTable.name}</span>
                <span className="pos-sel-meta">
                  {selectedTable.capacity} seats
                  {selectedTable.order_id ? ` · Rs. ${parseFloat(selectedTable.bill_total).toFixed(2)} on bill` : ""}
                </span>
              </div>
              <span className="pos-sel-change">Change</span>
            </button>
          ) : (
            <button className="pos-select-btn" onClick={onOpenTablePicker}>
              🪑  Select table
            </button>
          )}
        </div>

        {/* Waiter picker */}
        <div className="pos-context-row">
          <label className="pos-context-label">Waiter <span style={{ color: "#c0c8d6", fontWeight: 400 }}>(optional)</span></label>
          {selectedWaiter ? (
            <button className="pos-sel-card pos-sel-waiter" onClick={onOpenWaiterPicker}>
              <div className="pos-sel-waiter-avatar">
                {selectedWaiter.name.charAt(0).toUpperCase()}
              </div>
              <div className="pos-sel-info">
                <span className="pos-sel-name">{selectedWaiter.name}</span>
              </div>
              <span className="pos-sel-change">Change</span>
            </button>
          ) : (
            <button className="pos-select-btn pos-select-btn-muted" onClick={onOpenWaiterPicker}>
              👤  Select waiter
            </button>
          )}
        </div>
      </div>
    );
  }

  if (orderType === "delivery") {
    return (
      <div className="pos-context-panel">
        <div className="pos-context-row">
          <label className="pos-context-label  me-1">Customer Name</label>
          <input
            className="form-input pos-context-input"
            placeholder="Full name"
            value={ctx.customerName}
            onChange={(e) => onChange({ customerName: e.target.value })}
          />
        </div>
        <div className="pos-context-row">
          <label className="pos-context-label me-1">Phone</label>
          <input
            className="form-input pos-context-input"
            placeholder="+1 234 567 890"
            value={ctx.customerPhone}
            onChange={(e) => onChange({ customerPhone: e.target.value })}
          />
        </div>
        <div className="pos-context-row">
          <label className="pos-context-label me">Address <span style={{ color: "#EF4444" }}>*</span></label>
          <input
            className="form-input pos-context-input"
            placeholder="Delivery address"
            value={ctx.customerAddress}
            onChange={(e) => onChange({ customerAddress: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (orderType === "takeaway") {
    return (
      <div className="pos-context-panel">
        <div className="pos-context-row">
          <label className="pos-context-label">Customer Name</label>
          <input
            className="form-input pos-context-input"
            placeholder="Optional"
            value={ctx.customerName}
            onChange={(e) => onChange({ customerName: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ── Cart panel ─────────────────────────────────────────────────────────────────

function CartPanel({
  items, orderType, onOrderTypeChange,
  ctx, onCtxChange,
  selectedTable, selectedWaiter,
  onOpenTablePicker, onOpenWaiterPicker,
  onChangeQty, onRemove, onClear, onCharge, onPlaceOrder,
  openOrder, checkingOpenOrder, saving, onAddToOpenBill,
  onMobileClose,
}) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total    = subtotal;

  // Dine-in with an existing open order → "Add to Bill" mode
  const isAddMode = orderType === "dine_in" && !!openOrder;

  return (
    <div className="pos-cart">
      <div className="pos-cart-header">
        {/* Back-to-menu button — only visible on mobile (CSS-controlled) */}
        <button className="pos-mobile-back-btn" onClick={onMobileClose}>
          ← Menu
        </button>
        <span className="pos-cart-title">Order</span>
        {items.length > 0 && (
          <button className="pos-cart-clear" onClick={onClear}>Clear</button>
        )}
      </div>

      {/* Order type */}
      <div className="pos-order-type-bar">
        <div className="pos-order-type-seg">
          {[
            { key: "dine_in",  label: "Dine In",  icon: "🪑" },
            { key: "takeaway", label: "Takeaway",  icon: "🥡" },
            { key: "delivery", label: "Delivery",  icon: "🛵" },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              className={`pos-order-type-btn${orderType === key ? " active" : ""}`}
              onClick={() => onOrderTypeChange(key)}
            >
              <span className="pos-type-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Context fields */}
      <OrderContextPanel
        orderType={orderType}
        ctx={ctx}
        onChange={onCtxChange}
        selectedTable={selectedTable}
        selectedWaiter={selectedWaiter}
        onOpenTablePicker={onOpenTablePicker}
        onOpenWaiterPicker={onOpenWaiterPicker}
      />

      {/* Open bill banner — shown when an unpaid dine-in order exists for this table */}
      {orderType === "dine_in" && ctx.tableId && (
        checkingOpenOrder ? (
          <div className="pos-open-bill-checking">Checking table…</div>
        ) : openOrder ? (
          <OpenBillBanner order={openOrder} />
        ) : null
      )}

      <div className="pos-cart-items">
        {items.length === 0 ? (
          <div className="pos-cart-empty">
            <div className="pos-cart-empty-icon">🛒</div>
            <p className="pos-cart-empty-title">
              {isAddMode ? "Add items to the bill" : "Cart is empty"}
            </p>
            <p className="pos-cart-empty-hint">
              {isAddMode ? "Select products below" : "Tap a product to add it"}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item._cartId} className="pos-cart-item">
              <div className="pos-cart-item-info">
                <span className="pos-cart-item-name">{item.name}</span>
                {item.addons.length > 0 && (
                  <span className="pos-cart-item-addons">
                    {item.addons.map((a) => a.item_name).join(", ")}
                  </span>
                )}
              </div>
              <div className="pos-cart-item-right">
                <div className="pos-cart-qty">
                  <button className="pos-qty-btn sm" onClick={() => onChangeQty(item._cartId, item.quantity - 1)}>−</button>
                  <span className="pos-qty-value sm">{item.quantity}</span>
                  <button className="pos-qty-btn sm" onClick={() => onChangeQty(item._cartId, item.quantity + 1)}>+</button>
                </div>
                <span className="pos-cart-item-price">Rs. {(item.unitPrice * item.quantity).toFixed(2)}</span>
                <button className="pos-cart-remove" onClick={() => onRemove(item._cartId)}>✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pos-cart-totals">
        {isAddMode && openOrder && (
          <div className="pos-cart-total-row" style={{ color: "#9aa3b2", fontSize: "12px" }}>
            <span>Current Bill</span>
            <span>Rs. {parseFloat(openOrder.total).toFixed(2)}</span>
          </div>
        )}
        <div className="pos-cart-total-row">
          <span>{isAddMode ? "Adding" : "Subtotal"}</span>
          <span>Rs. {subtotal.toFixed(2)}</span>
        </div>
        {isAddMode && openOrder && items.length > 0 && (
          <div className="pos-cart-total-row" style={{ color: "#9aa3b2", fontSize: "12px" }}>
            <span>New Total</span>
            <span>Rs. {(parseFloat(openOrder.total) + subtotal).toFixed(2)}</span>
          </div>
        )}
        <div className="pos-cart-total-row grand">
          <span>Total</span>
          <span>Rs. {total.toFixed(2)}</span>
        </div>
      </div>

      {orderType === "dine_in" ? (
        isAddMode ? (
          <button
            className="btn pos-charge-btn pos-add-to-bill-btn"
            disabled={items.length === 0 || saving}
            onClick={onAddToOpenBill}
          >
            Add to Bill · Rs. {total.toFixed(2)}
          </button>
        ) : (
          <button
            className="btn btn-primary pos-charge-btn"
            disabled={items.length === 0 || saving}
            onClick={onPlaceOrder}
          >
            Place Order
          </button>
        )
      ) : orderType === "delivery" ? (
        <button
          className="btn btn-primary pos-charge-btn"
          disabled={items.length === 0 || saving}
          onClick={onPlaceOrder}
        >
          Place Order
        </button>
      ) : (
        <button
          className="btn btn-primary pos-charge-btn"
          disabled={items.length === 0 || saving}
          onClick={onPlaceOrder}
        >
          Place Order
        </button>
      )}
    </div>
  );
}

// ── Success banner ─────────────────────────────────────────────────────────────

function SuccessBanner({ result, onDismiss }) {
  const { order, payment, changeDue, addedToExisting, addedSubtotal } = result;
  const isDineIn = order.type === "dine-in";

  if (addedToExisting) {
    return (
      <div className="pos-success-overlay" onClick={onDismiss}>
        <div className="pos-success-box" onClick={(e) => e.stopPropagation()}>
          <div className="pos-success-icon" style={{ background: "#DCFCE7", color: "#22C55E" }}>+</div>
          <h2 className="pos-success-title">Items Added to Bill</h2>
          <p className="pos-success-number">{order.order_number}</p>
          <div className="pos-success-details">
            <div className="pos-success-row">
              <span>Added Now</span>
              <span>Rs. {parseFloat(addedSubtotal).toFixed(2)}</span>
            </div>
            <div className="pos-success-row" style={{ fontWeight: 700 }}>
              <span>New Total</span>
              <span style={{ color: "#EF476F" }}>Rs. {parseFloat(order.total).toFixed(2)}</span>
            </div>
            <div className="pos-success-row" style={{ color: "#e67700" }}>
              <span>Payment</span>
              <span>Collect later from Bills</span>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: "20px", width: "100%" }} onClick={onDismiss}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-success-overlay" onClick={onDismiss}>
      <div className="pos-success-box" onClick={(e) => e.stopPropagation()}>
        <div className="pos-success-icon">✓</div>
        <h2 className="pos-success-title">
          {isDineIn ? "Sent to Kitchen" : "Order Placed"}
        </h2>
        <p className="pos-success-number">{order.order_number}</p>
        <div className="pos-success-details">
          <div className="pos-success-row">
            <span>Type</span>
            <span style={{ textTransform: "capitalize" }}>{order.type.replace("-", " ")}</span>
          </div>
          <div className="pos-success-row">
            <span>Total</span>
            <span>Rs. {parseFloat(order.total).toFixed(2)}</span>
          </div>
          {isDineIn ? (
            <div className="pos-success-row" style={{ color: "#e67700" }}>
              <span>Payment</span>
              <span>Collect later from Bills</span>
            </div>
          ) : (order.type === "delivery" || order.type === "takeaway") && !payment ? (
            <div className="pos-success-row" style={{ color: "#e67700" }}>
              <span>Payment</span>
              <span>Collect later from Bills</span>
            </div>
          ) : (
            <>
              {payment && (
                <div className="pos-success-row">
                  <span>Payment</span>
                  <span style={{ textTransform: "capitalize" }}>{payment.method}</span>
                </div>
              )}
              {payment?.method === "cash" && changeDue > 0 && (
                <div className="pos-success-row" style={{ color: "#22C55E", fontWeight: 700 }}>
                  <span>Change Due</span>
                  <span>Rs. {changeDue.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>
        <button className="btn btn-primary" style={{ marginTop: "20px", width: "100%" }} onClick={onDismiss}>
          New Order
        </button>
      </div>
    </div>
  );
}

// ── Product grid ───────────────────────────────────────────────────────────────

function ProductGrid({ products, onSelect }) {
  if (products.length === 0) {
    return <div className="pos-empty">No products found.</div>;
  }
  return (
    <div className="pos-product-grid">
      {products.map((p) => (
        <button key={p.id} className="pos-product-card" onClick={() => onSelect(p)}>
          <div className="pos-product-img-wrap">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                className="pos-product-img"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="pos-product-img-placeholder">POS</div>
            )}
          </div>
          <div className="pos-product-name">{p.name}</div>
          {p.description && (
            <div className="pos-product-desc">{p.description}</div>
          )}
          <div className="pos-product-footer">
            <span className={`pos-product-type type-${p.type}`}>{p.type}</span>
            <span className="pos-product-price">
              {p.type === "variant"
                ? p.variants.length > 0
                  ? `from Rs. ${Math.min(...p.variants.map((v) => v.price)).toFixed(2)}`
                  : "—"
                : p.base_price != null
                  ? `Rs. ${p.base_price.toFixed(2)}`
                  : "—"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Main POS Page ──────────────────────────────────────────────────────────────

export default function POSPage() {
  const [categories,    setCategories]    = useState([]);
  const [products,      setProducts]      = useState([]);
  const [tables,        setTables]        = useState([]);
  const [staff,         setStaff]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [activeCat,     setActiveCat]     = useState("all");
  const [search,        setSearch]        = useState("");
  const [pickerProduct,   setPickerProduct]   = useState(null);
  const [comboProduct,    setComboProduct]    = useState(null);
  const [mobileCartOpen,  setMobileCartOpen]  = useState(false);

  const [cartItems,  setCartItems]  = useState([]);
  const [orderType,  setOrderType]  = useState("dine_in");
  const [ctx,        setCtx]        = useState({
    tableId: "", waiterId: "",
    customerName: "", customerPhone: "", customerAddress: "",
  });
  const [payModal,      setPayModal]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [payError,      setPayError]      = useState("");
  const [successResult, setSuccessResult] = useState(null);

  // ── Open-bill detection ────────────────────────────────────────────────────
  const [openOrder,          setOpenOrder]          = useState(null);
  const [checkingOpenOrder,  setCheckingOpenOrder]  = useState(false);

  // ── Picker modal state ─────────────────────────────────────────────────────
  const [tablePickerOpen,  setTablePickerOpen]  = useState(false);
  const [waiterPickerOpen, setWaiterPickerOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/pos/menu").then((r) => r.json()),
      fetch("/api/pos/tables-with-bills").then((r) => r.json()),
      fetch("/api/pos/staff").then((r) => r.json()),
    ]).then(([menuData, tablesData, staffData]) => {
      if (menuData.error) { setError(menuData.error); return; }
      setCategories(menuData.categories || []);
      setProducts(menuData.products     || []);
      setTables(tablesData.tables       || []);
      setStaff(staffData.staff          || []);
    }).catch(() => setError("Failed to load menu."))
      .finally(() => setLoading(false));
  }, []);

  // When table changes (dine-in), check for an existing open bill
  useEffect(() => {
    if (orderType !== "dine_in" || !ctx.tableId) {
      setOpenOrder(null);
      return;
    }
    let cancelled = false;
    setCheckingOpenOrder(true);
    fetch(`/api/pos/open-order?tableId=${ctx.tableId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setOpenOrder(d.order || null); })
      .catch(() => { if (!cancelled) setOpenOrder(null); })
      .finally(() => { if (!cancelled) setCheckingOpenOrder(false); });
    return () => { cancelled = true; };
  }, [ctx.tableId, orderType]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat !== "all") {
      list = list.filter((p) => String(p.category_id) === activeCat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCat, search]);

  // Reset context when order type changes
  function handleOrderTypeChange(type) {
    setOrderType(type);
    setOpenOrder(null);
    setTablePickerOpen(false);
    setWaiterPickerOpen(false);
    setCtx({ tableId: "", waiterId: "", customerName: "", customerPhone: "", customerAddress: "" });
  }

  // Derived: full objects for selected table and waiter
  const selectedTable  = tables.find((t) => String(t.id) === String(ctx.tableId))  || null;
  const selectedWaiter = staff.find((s)  => String(s.id) === String(ctx.waiterId)) || null;

  // ── Table / Waiter picker handlers ────────────────────────────────────────────

  function handleTableSelect(table) {
    setCtx((prev) => ({ ...prev, tableId: String(table.id) }));
    setTablePickerOpen(false);
    // Pre-populate openOrder immediately from the enriched table data;
    // the useEffect will confirm with a fresh fetch.
    if (table.order_id) {
      setOpenOrder({
        id:           table.order_id,
        order_number: table.order_number,
        total:        table.bill_total,
        status:       table.order_status,
        table_id:     table.id,
      });
    } else {
      setOpenOrder(null);
    }
  }

  function handleWaiterSelect(waiter) {
    setCtx((prev) => ({ ...prev, waiterId: waiter ? String(waiter.id) : "" }));
    setWaiterPickerOpen(false);
  }

  // ── Cart actions ─────────────────────────────────────────────────────────────

  function handleConfirmPick({ product, variant, addons, quantity, unitPrice }) {
    const key = cartItemKey(product, variant, addons);
    setCartItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i._cartId === existing._cartId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, buildCartItem(product, variant, addons, quantity, unitPrice)];
    });
    setPickerProduct(null);
  }

  function handleChangeQty(cartId, newQty) {
    if (newQty < 1) {
      setCartItems((prev) => prev.filter((i) => i._cartId !== cartId));
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i._cartId === cartId ? { ...i, quantity: newQty } : i))
      );
    }
  }

  function handleProductSelect(product) {
    if (product.type === "combo") {
      setComboProduct(product);
      return;
    }

    const needsModal =
      product.type === "variant" ||
      (product.addon_groups && product.addon_groups.length > 0);

    if (needsModal) {
      setPickerProduct(product);
    } else {
      handleConfirmPick({
        product,
        variant:   null,
        addons:    [],
        quantity:  1,
        unitPrice: product.base_price || 0,
      });
    }
  }

  // ── Dine-in: add items to an existing open bill ───────────────────────────────

  async function handleAddToOpenBill() {
    if (!openOrder) return;
    setSaving(true);
    setPayError("");

    const payload = {
      orderId: openOrder.id,
      items: cartItems.map((item) => ({
        productId:    item.productId,
        variantId:    item.variantId,
        productName:  item.productName,
        variantName:  item.variantName,
        unitPrice:    item.unitPrice,
        quantity:     item.quantity,
        isKitchenItem: item.isKitchenItem !== false,
        addons: (item.addons || []).map((a) => ({
          addonItemId: a.item_id,
          addonName:   a.item_name,
          price:       a.item_price,
        })),
      })),
    };

    try {
      const res  = await fetch("/api/pos/add-items", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.error || "Failed to add items."); setSaving(false); return; }

      setSuccessResult({
        order:           { ...openOrder, total: data.order.total, type: "dine-in" },
        payment:         null,
        changeDue:       0,
        addedToExisting: true,
        addedSubtotal:   data.addedSubtotal,
      });
    } catch {
      setPayError("Network error. Please try again.");
      setSaving(false);
    }
  }

  // ── Dine-in: place order without payment ─────────────────────────────────────

  async function handlePlaceOrder() {
    setSaving(true);
    setPayError("");

    const payload = {
      orderType,
      paymentMethod:   null,
      tableId:         ctx.tableId   || null,
      waiterId:        ctx.waiterId  || null,
      customerName:    (orderType === "takeaway" || orderType === "delivery") ? (ctx.customerName    || null) : null,
      customerPhone:   orderType === "delivery" ? (ctx.customerPhone   || null) : null,
      customerAddress: orderType === "delivery" ? (ctx.customerAddress || null) : null,
      items: cartItems.map((item) => ({
        productId:    item.productId,
        variantId:    item.variantId,
        productName:  item.productName,
        variantName:  item.variantName,
        unitPrice:    item.unitPrice,
        quantity:     item.quantity,
        isKitchenItem: item.isKitchenItem !== false,
        addons: (item.addons || []).map((a) => ({
          addonItemId: a.item_id,
          addonName:   a.item_name,
          price:       a.item_price,
        })),
      })),
    };

    try {
      const res  = await fetch("/api/pos/order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.error || "Failed to place order."); setSaving(false); return; }
      setSuccessResult(data);
    } catch {
      setPayError("Network error. Please try again.");
      setSaving(false);
    }
  }

  // ── Takeaway / Delivery: payment ─────────────────────────────────────────────

  async function handlePaymentConfirm({ method, cashTendered, cardReference }) {
    setSaving(true);
    setPayError("");

    const payload = {
      orderType,
      paymentMethod:   method,
      cashTendered:    method === "cash" ? cashTendered : undefined,
      cardReference:   method === "card" ? cardReference : undefined,
      tableId:         orderType === "dine_in"  ? (ctx.tableId   || null) : null,
      waiterId:        orderType === "dine_in"  ? (ctx.waiterId  || null) : null,
      customerName:    (orderType === "takeaway" || orderType === "delivery") ? (ctx.customerName || null) : null,
      customerPhone:   orderType === "delivery" ? (ctx.customerPhone   || null) : null,
      customerAddress: orderType === "delivery" ? (ctx.customerAddress || null) : null,
      items: cartItems.map((item) => ({
        productId:    item.productId,
        variantId:    item.variantId,
        productName:  item.productName,
        variantName:  item.variantName,
        unitPrice:    item.unitPrice,
        quantity:     item.quantity,
        isKitchenItem: item.isKitchenItem !== false,
        addons: (item.addons || []).map((a) => ({
          addonItemId: a.item_id,
          addonName:   a.item_name,
          price:       a.item_price,
        })),
      })),
    };

    try {
      const res  = await fetch("/api/pos/order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setPayError(data.error || "Failed to place order.");
        setSaving(false);
        return;
      }

      setPayModal(false);
      setSuccessResult(data);
    } catch {
      setPayError("Network error. Please try again.");
      setSaving(false);
    }
  }

  function handleSuccessDismiss() {
    const wasAddToExisting = successResult?.addedToExisting;
    const savedTableId     = ctx.tableId;

    setSuccessResult(null);
    setCartItems([]);
    setSaving(false);
    setPayError("");

    if (wasAddToExisting && savedTableId) {
      // Keep the same table/waiter so staff can add more items if needed.
      // Re-fetch the open order to get the updated total in the banner.
      fetch(`/api/pos/open-order?tableId=${savedTableId}`)
        .then((r) => r.json())
        .then((d) => setOpenOrder(d.order || null))
        .catch(() => {});
    } else {
      setCtx({ tableId: "", waiterId: "", customerName: "", customerPhone: "", customerAddress: "" });
      setOpenOrder(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const cartSubtotal = cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <div className={`pos-layout${mobileCartOpen ? " mobile-cart-open" : ""}`}>

      {/* Left: product browser */}
      <div className="pos-browser">
        <div className="pos-search-bar">
          <input
            className="form-input pos-search-input"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="pos-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div className="pos-cat-tabs">
          <button
            className={`pos-cat-tab${activeCat === "all" ? " active" : ""}`}
            onClick={() => setActiveCat("all")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`pos-cat-tab${activeCat === String(c.id) ? " active" : ""}`}
              onClick={() => setActiveCat(String(c.id))}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <PageLoader text="Loading menu…" />
        ) : error ? (
          <div className="pos-empty" style={{ color: "#EF476F" }}>{error}</div>
        ) : (
          <ProductGrid products={filtered} onSelect={handleProductSelect} />
        )}

        {/* Mobile cart toggle button — fixed at bottom, only visible on mobile via CSS */}
        {cartItems.length > 0 && (
          <button
            className="pos-mobile-cart-btn"
            onClick={() => setMobileCartOpen(true)}
          >
            <span>View Cart · {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}</span>
            <span className="pos-mobile-cart-btn-total">Rs. {cartSubtotal.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* Right: cart */}
      <CartPanel
        items={cartItems}
        orderType={orderType}
        onOrderTypeChange={handleOrderTypeChange}
        ctx={ctx}
        onCtxChange={(patch) => setCtx((prev) => ({ ...prev, ...patch }))}
        selectedTable={selectedTable}
        selectedWaiter={selectedWaiter}
        onOpenTablePicker={() => setTablePickerOpen(true)}
        onOpenWaiterPicker={() => setWaiterPickerOpen(true)}
        onChangeQty={handleChangeQty}
        onRemove={(cartId) => setCartItems((prev) => prev.filter((i) => i._cartId !== cartId))}
        onClear={() => setCartItems([])}
        onPlaceOrder={handlePlaceOrder}
        onCharge={() => { setPayError(""); setPayModal(true); }}
        openOrder={openOrder}
        checkingOpenOrder={checkingOpenOrder}
        saving={saving}
        onAddToOpenBill={handleAddToOpenBill}
        onMobileClose={() => setMobileCartOpen(false)}
      />

      {/* Variant / addon picker */}
      {pickerProduct && (
        <ProductPickerModal
          product={pickerProduct}
          onConfirm={handleConfirmPick}
          onClose={() => setPickerProduct(null)}
        />
      )}

      {/* Combo deal picker */}
      {comboProduct && (
        <ComboPickerModal
          product={comboProduct}
          onConfirm={(pick) => { handleConfirmPick(pick); setComboProduct(null); }}
          onClose={() => setComboProduct(null)}
        />
      )}

      {/* Payment modal */}
      {payModal && (
        <PaymentModal
          cartItems={cartItems}
          orderType={orderType}
          saving={saving}
          onConfirm={handlePaymentConfirm}
          onClose={() => !saving && setPayModal(false)}
        />
      )}
      {payModal && payError && (
        <p className="form-error" style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "8px 16px", borderRadius: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 1100 }}>
          {payError}
        </p>
      )}

      {/* Success overlay */}
      {successResult && (
        <SuccessBanner result={successResult} onDismiss={handleSuccessDismiss} />
      )}

      {/* Table picker modal */}
      {tablePickerOpen && (
        <TablePickerModal
          tables={tables}
          onSelect={handleTableSelect}
          onClose={() => setTablePickerOpen(false)}
        />
      )}

      {/* Waiter picker modal */}
      {waiterPickerOpen && (
        <WaiterPickerModal
          staff={staff}
          selectedWaiterId={ctx.waiterId}
          onSelect={handleWaiterSelect}
          onClose={() => setWaiterPickerOpen(false)}
        />
      )}
    </div>
  );
}
