import { useState } from "react";

export default function ComboPickerModal({ product, onConfirm, onClose }) {
  const [qty, setQty] = useState(1);

  const unitPrice  = product.base_price || 0;
  const totalPrice = unitPrice * qty;

  function handleConfirm() {
    onConfirm({
      product,
      variant:   null,
      addons:    [],
      quantity:  qty,
      unitPrice,
    });
  }

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
          <div className="pos-section-block">
            <p className="pos-section-label">
              Includes
              <span className="pos-section-hint">{product.combo_contents.length} item{product.combo_contents.length !== 1 ? "s" : ""}</span>
            </p>

            {product.combo_contents.length === 0 ? (
              <p style={{ color: "#9CA3AF", fontSize: "13px" }}>No contents listed for this combo.</p>
            ) : (
              <div className="combo-contents-list">
                {product.combo_contents.map((item, i) => (
                  <div key={i} className="combo-contents-row">
                    <span className="combo-contents-name">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pos-picker-footer">
          <div>
            <p className="pos-qty-label">Quantity</p>
            <div className="pos-qty-row">
              <button className="pos-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="pos-qty-value">{qty}</span>
              <button className="pos-qty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className="pos-picker-actions">
            <div className="pos-picker-total">
              <p className="pos-picker-total-label">Total</p>
              <p className="pos-picker-total-value">Rs. {totalPrice.toFixed(2)}</p>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleConfirm}>
              Add to Order
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
