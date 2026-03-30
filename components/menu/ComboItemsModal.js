import { useState, useEffect, useMemo } from "react";

export default function ComboItemsModal({ product, allProducts, categories, onClose }) {
  const [items,          setItems]         = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected,       setSelected]      = useState("");
  const [qty,            setQty]           = useState("1");
  const [error,          setError]         = useState("");
  const [saving,         setSaving]        = useState(false);

  // Products that can be added: exclude combos and the product itself
  const addableProducts = useMemo(() => {
    const base = allProducts.filter((p) => p.id !== product.id && p.type !== "combo");
    if (!categoryFilter) return base;
    return base.filter((p) => String(p.category_id) === String(categoryFilter));
  }, [allProducts, product.id, categoryFilter]);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const res  = await fetch(`/api/combo-items?combo_id=${product.id}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!selected) return;
    setError("");
    setSaving(true);
    const res  = await fetch("/api/combo-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ combo_id: product.id, product_id: parseInt(selected), quantity: parseInt(qty) || 1 }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    // Re-fetch to get product_name and base_price from join
    fetchItems();
    setSelected("");
    setQty("1");
  }

  async function handleUpdateQty(item, newQty) {
    const res = await fetch(`/api/combo-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: parseInt(newQty) }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: parseInt(newQty) } : i)));
    }
  }

  async function handleRemove(id) {
    if (!confirm("Remove this item from the combo?")) return;
    const res = await fetch(`/api/combo-items/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Summary calculations
  const itemsTotal = items.reduce((sum, i) => sum + parseFloat(i.base_price || 0) * i.quantity, 0);
  const comboPrice = parseFloat(product.base_price || 0);
  const hasSummary = items.length > 0 && comboPrice > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Combo Contents — {product.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: "20px" }}>

          {/* Summary strip */}
          {hasSummary && (
            <div style={{
              display: "flex", gap: "24px", background: "#f8f9fa",
              border: "1px solid #e9ecef", borderRadius: "6px",
              padding: "10px 16px", fontSize: "13px",
            }}>
              <span>
                <span style={{ color: "#888" }}>Included items total: </span>
                <strong>Rs. {itemsTotal.toFixed(2)}</strong>
              </span>
              <span>
                <span style={{ color: "#888" }}>Combo selling price: </span>
                <strong style={{ color: "#7048e8" }}>Rs. {comboPrice.toFixed(2)}</strong>
              </span>
              {itemsTotal > 0 && comboPrice > 0 && (
                <span>
                  <span style={{ color: "#888" }}>Saving: </span>
                  <strong style={{ color: "#2f9e44" }}>
                    Rs. {Math.max(0, itemsTotal - comboPrice).toFixed(2)}
                  </strong>
                </span>
              )}
            </div>
          )}

          {/* Items table */}
          {loading ? (
            <p style={{ color: "#999" }}>Loading...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th style={{ width: "90px" }}>Qty</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                    <td>
                      <span className="badge" style={{ background: "#f0f4ff", color: "#3b5bdb" }}>
                        {item.product_type}
                      </span>
                    </td>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        style={{ padding: "4px 8px", width: "70px" }}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(item, e.target.value)}
                      />
                    </td>
                    <td>
                      <button className="btn btn-sm"
                        style={{ background: "#fff3f3", color: "#e03131", border: "1px solid #ffc9c9" }}
                        onClick={() => handleRemove(item.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#bbb", padding: "20px" }}>
                      No items in this combo yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Add product row */}
          <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "10px" }}>
              ADD PRODUCT TO COMBO
            </p>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
              {/* Category filter */}
              <div className="form-group" style={{ width: "160px" }}>
                <label className="form-label">Filter by Category</label>
                <select
                  className="form-input"
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setSelected(""); }}
                >
                  <option value="">All categories</option>
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Product select */}
              <div className="form-group" style={{ flex: 1, minWidth: "160px" }}>
                <label className="form-label">Product</label>
                <select className="form-input" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">— Select product —</option>
                  {addableProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Qty */}
              <div className="form-group" style={{ width: "80px" }}>
                <label className="form-label">Qty</label>
                <input className="form-input" type="number" min="1"
                  value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>

              <button className="btn btn-primary" onClick={handleAdd} disabled={!selected || saving}>
                {saving ? "..." : "+ Add"}
              </button>
            </div>
            {error && <p className="form-error" style={{ marginTop: "8px" }}>{error}</p>}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
