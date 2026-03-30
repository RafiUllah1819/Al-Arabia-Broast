import { useState, useEffect } from "react";

const EMPTY = { name: "", sort_order: "0" };

export default function CategoryFormModal({ category, onClose, onSaved }) {
  const isEditing = Boolean(category);

  const [form,  setForm]  = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({ name: category.name, sort_order: String(category.sort_order) });
    } else {
      setForm(EMPTY);
    }
    setError("");
  }, [category]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const url    = isEditing ? `/api/categories/${category.id}` : "/api/categories";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || "Something went wrong."); return; }

      onSaved(data.category, isEditing);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? "Edit Category" : "Add Category"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category Name</label>
              <input
                className="form-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Burgers"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sort Order</label>
              <input
                className="form-input"
                type="number"
                name="sort_order"
                value={form.sort_order}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>

            {error && <p className="form-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
