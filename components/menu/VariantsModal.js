import { useState, useEffect } from "react";

const EMPTY_FORM = { name: "", price: "", sort_order: "0" };

export default function VariantsModal({ product, isAdmin, onClose }) {
  const [variants, setVariants] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { fetchVariants(); }, []);

  async function fetchVariants() {
    setLoading(true);
    const res  = await fetch(`/api/variants?product_id=${product.id}`);
    const data = await res.json();
    setVariants(data.variants || []);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res  = await fetch("/api/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, product_id: product.id }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setVariants((prev) => [...prev, data.variant]);
    setForm(EMPTY_FORM);
  }

  async function handleSaveEdit(id) {
    setError("");
    const res  = await fetch(`/api/variants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...data.variant } : v)));
    setEditingId(null);
  }

  async function handleToggle(variant, field, value) {
    const res  = await fetch(`/api/variants/${variant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
    if (res.ok) {
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? { ...v, [field]: value } : v)));
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this variant?")) return;
    const res = await fetch(`/api/variants/${id}`, { method: "DELETE" });
    if (res.ok) setVariants((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Variants — {product.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: "20px" }}>
          {/* Existing variants */}
          {loading ? (
            <p style={{ color: "#999" }}>Loading...</p>
          ) : (
            <table className="data-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Available</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {editingId === v.id ? (
                        <input className="form-input" style={{ padding: "4px 8px" }}
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                      ) : v.name}
                    </td>
                    <td>
                      {editingId === v.id ? (
                        <input className="form-input" type="number" style={{ padding: "4px 8px", width: "90px" }}
                          value={editForm.price}
                          onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} />
                      ) : `Rs. ${parseFloat(v.price).toFixed(2)}`}
                    </td>
                    <td>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={v.is_available}
                          onChange={() => handleToggle(v, "is_available", !v.is_available)} />
                        <span className="toggle-slider" />
                      </label>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="action-buttons">
                          {editingId === v.id ? (
                            <>
                              <button className="btn btn-sm btn-primary" onClick={() => handleSaveEdit(v.id)}>Save</button>
                              <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-sm btn-secondary"
                                onClick={() => { setEditingId(v.id); setEditForm({ name: v.name, price: String(v.price), sort_order: String(v.sort_order) }); }}>
                                Edit
                              </button>
                              <button className="btn btn-sm"
                                style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
                                onClick={() => handleDelete(v.id)}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {variants.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} style={{ textAlign: "center", color: "#bbb", padding: "20px" }}>
                      No variants yet. Add one below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Add variant form — admin only */}
          {isAdmin && (
            <form onSubmit={handleAdd}>
              <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "10px" }}>
                  ADD VARIANT
                </p>
                <div className="form-row" style={{ alignItems: "flex-end" }}>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-input" placeholder="e.g. Large"
                      value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price</label>
                    <input className="form-input" type="number" placeholder="0.00" step="0.01" min="0"
                      value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginBottom: "0" }} disabled={saving}>
                    {saving ? "..." : "+ Add"}
                  </button>
                </div>
                {error && <p className="form-error" style={{ marginTop: "8px" }}>{error}</p>}
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
