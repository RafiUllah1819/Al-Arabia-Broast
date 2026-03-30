import { useState } from "react";

export default function PaymentModal({ cartItems, orderType, onConfirm, onClose, saving }) {
  const subtotal = cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total    = subtotal;

  const [method,        setMethod]        = useState("cash");
  const [cashTendered,  setCashTendered]  = useState("");
  const [cardReference, setCardReference] = useState("");
  const [error,         setError]         = useState("");

  const tendered  = parseFloat(cashTendered) || 0;
  const changeDue = method === "cash" ? tendered - total : 0;

  function handleConfirm() {
    setError("");
    if (method === "cash") {
      if (!cashTendered || tendered < total) {
        setError(`Cash received must be at least Rs. ${total.toFixed(2)}.`);
        return;
      }
    }
    onConfirm({ method, cashTendered: tendered, cardReference: cardReference.trim() });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: "400px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Payment</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Order summary */}
          <div className="pay-summary">
            <div className="pay-summary-row">
              <span>Items ({cartItems.reduce((s, i) => s + i.quantity, 0)})</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="pay-summary-row pay-total-row">
              <span>Total</span>
              <span>Rs. {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="form-label" style={{ marginBottom: "8px" }}>Payment Method</p>
            <div className="pay-method-bar">
              <button
                className={`pay-method-btn${method === "cash" ? " active" : ""}`}
                onClick={() => setMethod("cash")}
              >
                Cash
              </button>
              <button
                className={`pay-method-btn${method === "card" ? " active" : ""}`}
                onClick={() => setMethod("card")}
              >
                Card
              </button>
            </div>
          </div>

          {/* Cash inputs */}
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

          {/* Card reference */}
          {method === "card" && (
            <div className="form-group">
              <label className="form-label">
                Reference <span className="form-hint">(optional)</span>
              </label>
              <input
                className="form-input"
                placeholder="Terminal receipt / transaction ID"
                value={cardReference}
                onChange={(e) => setCardReference(e.target.value)}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? "Processing..." : `Confirm Rs. ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
