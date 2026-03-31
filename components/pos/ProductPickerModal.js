import { useState } from "react";

export default function ProductPickerModal({ product, onConfirm, onClose }) {
  const isVariant = product.type === "variant";
  const hasAddons  = product.addon_groups && product.addon_groups.length > 0;

  // Variant selection
  const [selectedVariant, setSelectedVariant] = useState(
    isVariant && product.variants.length === 1 ? product.variants[0] : null
  );

  // Addon selections: { [groupId]: Set of item ids }
  const [addonSelections, setAddonSelections] = useState(() => {
    const init = {};
    (product.addon_groups || []).forEach((g) => { init[g.id] = new Set(); });
    return init;
  });

  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");

  // ── Derived price ──────────────────────────────────────────────────────────

  const basePrice = isVariant
    ? (selectedVariant ? selectedVariant.price : 0)
    : (product.base_price || 0);

  const addonTotal = Object.entries(addonSelections).reduce((sum, [groupId, ids]) => {
    const group = product.addon_groups.find((g) => g.id === parseInt(groupId));
    if (!group) return sum;
    return sum + group.items
      .filter((i) => ids.has(i.id))
      .reduce((s, i) => s + i.price, 0);
  }, 0);

  const unitPrice   = basePrice + addonTotal;
  const totalPrice  = unitPrice * qty;

  // ── Addon toggle ───────────────────────────────────────────────────────────

  function toggleAddon(group, itemId) {
    setAddonSelections((prev) => {
      const current = new Set(prev[group.id]);
      if (current.has(itemId)) {
        current.delete(itemId);
      } else {
        if (group.max_select > 0 && current.size >= group.max_select) {
          // Replace oldest if single-select
          if (group.max_select === 1) {
            current.clear();
          } else {
            setError(`Max ${group.max_select} selections allowed for "${group.name}"`);
            return prev;
          }
        }
        current.add(itemId);
      }
      setError("");
      return { ...prev, [group.id]: current };
    });
  }

  // ── Validation & confirm ───────────────────────────────────────────────────

  function handleConfirm() {
    if (isVariant && !selectedVariant) {
      setError("Please select a variant.");
      return;
    }
    for (const group of product.addon_groups || []) {
      const count = addonSelections[group.id]?.size || 0;
      if (group.min_select > 0 && count < group.min_select) {
        setError(`"${group.name}" requires at least ${group.min_select} selection(s).`);
        return;
      }
    }

    const selectedAddons = [];
    for (const group of product.addon_groups || []) {
      for (const itemId of addonSelections[group.id] || []) {
        const item = group.items.find((i) => i.id === itemId);
        if (item) selectedAddons.push({ group_id: group.id, group_name: group.name, item_id: item.id, item_name: item.name, item_price: item.price });
      }
    }

    onConfirm({
      product,
      variant:  selectedVariant,
      addons:   selectedAddons,
      quantity: qty,
      unitPrice,
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const canConfirm = !isVariant || selectedVariant;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pos-picker-modal" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <h3>{product.name}</h3>
            {product.description && (
              <p className="pos-picker-desc">{product.description}</p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Variant selection */}
          {isVariant && (
            <div className="pos-section-block">
              <p className="pos-section-label">
                Choose Variant
                <span className="pos-section-hint">Required</span>
              </p>
              <div className="pos-option-grid">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    className={`pos-option-btn${selectedVariant?.id === v.id ? " selected" : ""}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    <span className="pos-option-name">{v.name}</span>
                    <span className="pos-option-price">Rs. {v.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Addon groups */}
          {(product.addon_groups || []).map((group) => (
            <div key={group.id} className="pos-section-block">
              <p className="pos-section-label">
                {group.name}
                <span className="pos-section-hint">
                  {group.min_select > 0 ? `Min ${group.min_select}` : "Optional"}
                  {group.max_select > 0 ? ` · Max ${group.max_select}` : ""}
                </span>
              </p>
              <div className="pos-option-grid">
                {group.items.map((item) => {
                  const checked = addonSelections[group.id]?.has(item.id);
                  return (
                    <button
                      key={item.id}
                      className={`pos-option-btn${checked ? " selected" : ""}`}
                      onClick={() => toggleAddon(group, item.id)}
                    >
                      <span className="pos-option-name">{item.name}</span>
                      <span className="pos-option-price">
                        {item.price === 0 ? "Free" : `+Rs. ${item.price.toFixed(2)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* No customisation needed */}
          {!isVariant && !hasAddons && (
            <p style={{ color: "#9CA3AF", fontSize: "13px" }}>No customisation options for this item.</p>
          )}

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="pos-picker-footer">
          {/* Qty control */}
          <div>
            <p className="pos-qty-label">Quantity</p>
            <div className="pos-qty-row">
              <button className="pos-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="pos-qty-value">{qty}</span>
              <button className="pos-qty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className="pos-picker-actions">
            {/* Total */}
            <div className="pos-picker-total">
              {canConfirm ? (
                <>
                  <p className="pos-picker-total-label">Total</p>
                  <p className="pos-picker-total-value">Rs. {totalPrice.toFixed(2)}</p>
                </>
              ) : (
                <p className="pos-picker-total-hint">Select a variant</p>
              )}
            </div>

            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              Add to Order
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
