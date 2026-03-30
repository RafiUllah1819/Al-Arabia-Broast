import { useState, useEffect } from "react";

export default function ComboItemsModal({ product, allProducts, onClose }) {
  const [items,    setItems]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [qty,      setQty]      = useState("1");
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  // Products that can be added: exclude combos and the product itself
  const addableProducts = allProducts.filter(
    (p) => p.id !== product.id && p.type !== "combo"
  );

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
    // Re-fetch to get product_name from join
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Combo Contents — {product.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: "20px" }}>
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

          {/* Add product to combo */}
          <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "10px" }}>
              ADD PRODUCT TO COMBO
            </p>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Product</label>
                <select className="form-input" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">— Select product —</option>
                  {addableProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
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
