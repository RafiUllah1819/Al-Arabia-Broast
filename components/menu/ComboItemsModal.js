import { useState, useEffect, useMemo } from "react";

export default function ComboItemsModal({ product, allProducts, categories, onClose }) {
  const [items,           setItems]          = useState([]);
  const [loadingItems,    setLoadingItems]   = useState(true);
  const [menuOptions,     setMenuOptions]    = useState([]); // simple products + variants
  const [comboOnlyItems,  setComboOnlyItems] = useState([]); // combo-only items from separate table
  const [loadingOptions,  setLoadingOptions] = useState(true);
  const [categoryFilter,  setCategoryFilter] = useState("");
  const [selected,        setSelected]       = useState(""); // "p:productId|variantId" or "c:itemId"
  const [error,           setError]          = useState("");
  const [saving,          setSaving]         = useState(false);

  // Quick-add: create a brand-new combo-only item and add it to the combo in one step
  const [quickName,       setQuickName]      = useState("");
  const [quickSaving,     setQuickSaving]    = useState(false);
  const [quickError,      setQuickError]     = useState("");

  useEffect(() => {
    fetchItems();
    buildOptions();
  }, []);

  async function fetchItems() {
    setLoadingItems(true);
    const res  = await fetch(`/api/combo-items?combo_id=${product.id}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoadingItems(false);
  }

  async function buildOptions() {
    setLoadingOptions(true);

    // Fetch combo-only items and variants for variant products in parallel
    const eligible        = allProducts.filter((p) => p.id !== product.id && p.type !== "combo");
    const variantProducts = eligible.filter((p) => p.type === "variant");
    const simpleProducts  = eligible.filter((p) => p.type === "simple");

    const [comboOnlyRes, ...variantResults] = await Promise.all([
      fetch("/api/combo-only-items").then((r) => r.json()).catch(() => ({ items: [] })),
      ...variantProducts.map((p) =>
        fetch(`/api/variants?product_id=${p.id}`)
          .then((r) => r.json())
          .then((d) => ({ productId: p.id, categoryId: p.category_id, productName: p.name, variants: d.variants || [] }))
          .catch(() => ({ productId: p.id, categoryId: p.category_id, productName: p.name, variants: [] }))
      ),
    ]);

    setComboOnlyItems(comboOnlyRes.items || []);

    // Build flat menu options list (no prices)
    const list = [];

    for (const p of simpleProducts) {
      list.push({
        key:        `p:${p.id}|null`,
        label:      p.name,
        categoryId: p.category_id,
      });
    }

    for (const { productId, categoryId, productName, variants } of variantResults) {
      for (const v of variants) {
        if (!v.is_active || !v.is_available) continue;
        list.push({
          key:        `p:${productId}|${v.id}`,
          label:      `${productName} — ${v.name}`,
          categoryId,
        });
      }
    }

    list.sort((a, b) => a.label.localeCompare(b.label));
    setMenuOptions(list);
    setLoadingOptions(false);
  }

  // Apply category filter to menu options only (combo-only items have no category)
  const filteredMenuOptions = useMemo(() => {
    if (!categoryFilter) return menuOptions;
    return menuOptions.filter((i) => String(i.categoryId) === String(categoryFilter));
  }, [menuOptions, categoryFilter]);

  async function handleAdd() {
    if (!selected) return;
    setError("");
    setSaving(true);

    let body;
    if (selected.startsWith("c:")) {
      // Combo-only item
      body = { combo_id: product.id, combo_only_item_id: parseInt(selected.slice(2)), quantity: 1 };
    } else {
      // Menu product / variant  (key format: "p:productId|variantId")
      const [productIdStr, variantIdStr] = selected.slice(2).split("|");
      body = {
        combo_id:   product.id,
        product_id: parseInt(productIdStr),
        variant_id: variantIdStr === "null" ? null : parseInt(variantIdStr),
        quantity:   1,
      };
    }

    const res  = await fetch("/api/combo-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    fetchItems();
    setSelected("");
  }

  async function handleRemove(id) {
    if (!confirm("Remove this item from the combo?")) return;
    const res = await fetch(`/api/combo-items/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleQuickAdd() {
    if (!quickName.trim()) return;
    setQuickError("");
    setQuickSaving(true);

    // Step 1: create the new combo-only item
    const createRes  = await fetch("/api/combo-only-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: quickName.trim(), sort_order: 0 }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      setQuickError(createData.error || "Failed to create item.");
      setQuickSaving(false);
      return;
    }

    const newItem = createData.item;

    // Step 2: add it to the combo
    const addRes  = await fetch("/api/combo-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ combo_id: product.id, combo_only_item_id: newItem.id, quantity: 1 }),
    });
    const addData = await addRes.json();
    setQuickSaving(false);
    if (!addRes.ok) {
      setQuickError(addData.error || "Failed to add item to combo.");
      return;
    }

    // Refresh both the combo items list and the combo-only items pool
    fetchItems();
    setComboOnlyItems((prev) => [...prev, newItem]);
    setQuickName("");
  }

  function itemDisplayName(item) {
    if (item.combo_only_item_id) return item.combo_only_item_name;
    if (item.variant_name)       return `${item.product_name} — ${item.variant_name}`;
    return item.product_name;
  }

  function itemBadge(item) {
    if (item.combo_only_item_id) return { label: "combo only", bg: "#f3f0ff", color: "#7048e8" };
    if (item.variant_name)       return { label: "variant",    bg: "#fff8f0", color: "#e67700" };
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Combo Contents — {product.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: "20px" }}>

          {/* Combo selling price reminder */}
          {product.base_price && (
            <div style={{ fontSize: "13px", color: "#555", background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: "6px", padding: "8px 14px" }}>
              Combo selling price: <strong style={{ color: "#7048e8" }}>Rs. {parseFloat(product.base_price).toFixed(2)}</strong>
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
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const badge = itemBadge(item);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>
                        {itemDisplayName(item)}
                        {badge && (
                          <span className="badge" style={{ marginLeft: "8px", background: badge.bg, color: badge.color, fontSize: "11px" }}>
                            {badge.label}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
                          onClick={() => handleRemove(item.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: "center", color: "#bbb", padding: "20px" }}>
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
              <p style={{ color: "#999", fontSize: "13px" }}>Loading...</p>
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>

                {/* Category filter — only affects menu products, not combo-only items */}
                <div className="form-group" style={{ width: "155px" }}>
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

                {/* Item selector */}
                <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
                  <label className="form-label">Item</label>
                  <select
                    className="form-input"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">— Select item —</option>

                    {filteredMenuOptions.length > 0 && (
                      <optgroup label="Menu Products">
                        {filteredMenuOptions.map((opt) => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </optgroup>
                    )}

                    {comboOnlyItems.length > 0 && (
                      <optgroup label="Combo-Only Items">
                        {comboOnlyItems.map((item) => (
                          <option key={`c:${item.id}`} value={`c:${item.id}`}>{item.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
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

            {/* Quick-add: type a new item name that doesn't exist anywhere yet */}
            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed #e9ecef" }}>
              <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Or type a new item not in any list
              </p>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
                  <label className="form-label">New item name</label>
                  <input
                    className="form-input"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="e.g. 8 Piece Chicken"
                    onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={handleQuickAdd}
                  disabled={!quickName.trim() || quickSaving}
                >
                  {quickSaving ? "..." : "+ Add New"}
                </button>
              </div>
              {quickError && <p className="form-error" style={{ marginTop: "8px" }}>{quickError}</p>}
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
