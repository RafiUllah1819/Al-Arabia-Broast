import { useState, useEffect, useMemo } from "react";

export default function ComboItemsModal({ product, allProducts, categories, onClose }) {
  const [items,          setItems]         = useState([]);
  const [loadingItems,   setLoadingItems]  = useState(true);
  const [sellableItems,  setSellableItems] = useState([]); // flat list: simple products + variants
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected,       setSelected]      = useState(""); // "productId|variantId" or "productId|null"
  const [qty,            setQty]           = useState("1");
  const [error,          setError]         = useState("");
  const [saving,         setSaving]        = useState(false);

  // On mount: load existing combo items + build the flat sellable items list
  useEffect(() => {
    fetchItems();
    buildSellableItems();
  }, []);

  async function fetchItems() {
    setLoadingItems(true);
    const res  = await fetch(`/api/combo-items?combo_id=${product.id}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoadingItems(false);
  }

  async function buildSellableItems() {
    setLoadingOptions(true);

    // Products eligible to be added: not combos, not the combo itself
    const eligible = allProducts.filter((p) => p.id !== product.id && p.type !== "combo");

    const simpleProducts  = eligible.filter((p) => p.type === "simple");
    const variantProducts = eligible.filter((p) => p.type === "variant");

    // Fetch all variants for every variant-type product in parallel
    const variantResults = await Promise.all(
      variantProducts.map((p) =>
        fetch(`/api/variants?product_id=${p.id}`)
          .then((r) => r.json())
          .then((d) => ({ productId: p.id, variants: d.variants || [] }))
          .catch(() => ({ productId: p.id, variants: [] }))
      )
    );

    // Build variantMap: productId → variants array
    const variantMap = {};
    for (const { productId, variants } of variantResults) {
      variantMap[productId] = variants;
    }

    // Build flat sellable list
    const list = [];

    for (const p of simpleProducts) {
      list.push({
        key:        `${p.id}|null`,
        label:      p.name,
        productId:  p.id,
        variantId:  null,
        categoryId: p.category_id,
        price:      parseFloat(p.base_price || 0),
      });
    }

    for (const p of variantProducts) {
      for (const v of variantMap[p.id] || []) {
        if (!v.is_active || !v.is_available) continue; // skip inactive/unavailable variants
        list.push({
          key:        `${p.id}|${v.id}`,
          label:      `${p.name} — ${v.name}`,
          productId:  p.id,
          variantId:  v.id,
          categoryId: p.category_id,
          price:      parseFloat(v.price || 0),
        });
      }
    }

    // Sort: by category then by label
    list.sort((a, b) => a.label.localeCompare(b.label));

    setSellableItems(list);
    setLoadingOptions(false);
  }

  // Filtered sellable items for the dropdown
  const filteredOptions = useMemo(() => {
    if (!categoryFilter) return sellableItems;
    return sellableItems.filter((i) => String(i.categoryId) === String(categoryFilter));
  }, [sellableItems, categoryFilter]);

  async function handleAdd() {
    if (!selected) return;
    const [productIdStr, variantIdStr] = selected.split("|");
    const productId = parseInt(productIdStr);
    const variantId = variantIdStr === "null" ? null : parseInt(variantIdStr);

    setError("");
    setSaving(true);
    const res  = await fetch("/api/combo-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        combo_id:   product.id,
        product_id: productId,
        variant_id: variantId,
        quantity:   parseInt(qty) || 1,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
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
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: parseInt(newQty) } : i))
      );
    }
  }

  async function handleRemove(id) {
    if (!confirm("Remove this item from the combo?")) return;
    const res = await fetch(`/api/combo-items/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Display label for an existing combo item row
  function itemDisplayName(item) {
    if (item.variant_name) return `${item.product_name} — ${item.variant_name}`;
    return item.product_name;
  }

  // Summary calculations
  const itemsTotal = items.reduce((sum, i) => {
    const price = i.variant_price != null ? parseFloat(i.variant_price) : parseFloat(i.product_base_price || 0);
    return sum + price * i.quantity;
  }, 0);
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
              display: "flex", gap: "24px", flexWrap: "wrap",
              background: "#f8f9fa", border: "1px solid #e9ecef",
              borderRadius: "6px", padding: "10px 16px", fontSize: "13px",
            }}>
              <span>
                <span style={{ color: "#888" }}>Items total: </span>
                <strong>Rs. {itemsTotal.toFixed(2)}</strong>
              </span>
              <span>
                <span style={{ color: "#888" }}>Combo price: </span>
                <strong style={{ color: "#7048e8" }}>Rs. {comboPrice.toFixed(2)}</strong>
              </span>
              {itemsTotal > comboPrice && (
                <span>
                  <span style={{ color: "#888" }}>Customer saves: </span>
                  <strong style={{ color: "#2f9e44" }}>
                    Rs. {(itemsTotal - comboPrice).toFixed(2)}
                  </strong>
                </span>
              )}
            </div>
          )}

          {/* Existing items table */}
          {loadingItems ? (
            <p style={{ color: "#999" }}>Loading...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ width: "90px" }}>Qty</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>
                      {itemDisplayName(item)}
                      {item.variant_name && (
                        <span className="badge" style={{
                          marginLeft: "8px", background: "#fff8f0",
                          color: "#e67700", fontSize: "11px",
                        }}>
                          variant
                        </span>
                      )}
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
                      <button
                        className="btn btn-sm"
                        style={{ background: "#fff3f3", color: "#e03131", border: "1px solid #ffc9c9" }}
                        onClick={() => handleRemove(item.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "#bbb", padding: "20px" }}>
                      No items in this combo yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Add item row */}
          <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "10px" }}>
              ADD ITEM TO COMBO
            </p>
            {loadingOptions ? (
              <p style={{ color: "#999", fontSize: "13px" }}>Loading products...</p>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>

                {/* Category filter — optional */}
                <div className="form-group" style={{ width: "160px" }}>
                  <label className="form-label">Category filter</label>
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

                {/* Item selector — simple products + individual variants */}
                <div className="form-group" style={{ flex: 1, minWidth: "180px" }}>
                  <label className="form-label">Item</label>
                  <select
                    className="form-input"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">— Select item —</option>
                    {filteredOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                        {opt.price > 0 ? `  (Rs. ${opt.price.toFixed(0)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty */}
                <div className="form-group" style={{ width: "80px" }}>
                  <label className="form-label">Qty</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleAdd}
                  disabled={!selected || saving}
                >
                  {saving ? "..." : "+ Add"}
                </button>
              </div>
            )}
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
