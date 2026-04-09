import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import CategoryFormModal from "../components/menu/CategoryFormModal";
import ProductFormModal  from "../components/menu/ProductFormModal";
import VariantsModal     from "../components/menu/VariantsModal";
import PageLoader from "../components/ui/PageLoader";
import ComboItemsModal   from "../components/menu/ComboItemsModal";
import AddonsTab         from "../components/menu/AddonsTab";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  simple:  { background: "#EFF6FF", color: "#3B82F6" },
  variant: { background: "#FFF7ED", color: "#F59E0B" },
  combo:   { background: "#F5F3FF", color: "#7C3AED" },
};

function formatPrice(price) {
  if (price == null) return "—";
  return `Rs. ${parseFloat(price).toFixed(2)}`;
}

// ── Categories Tab ────────────────────────────────────────────────────────────

function CategoriesTab({ isAdmin }) {
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res  = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  }

  function handleSaved(saved, wasEditing) {
    if (wasEditing) {
      setCategories((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)));
    } else {
      setCategories((prev) => [...prev, saved]);
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleToggleActive(category) {
    setActionError("");
    const newVal = !category.is_active;
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, is_active: newVal } : c)));
    const res  = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newVal }),
    });
    if (!res.ok) {
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, is_active: category.is_active } : c)));
      const data = await res.json();
      setActionError(data.error || "Failed to update.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <span style={{ color: "#888", fontSize: "13px" }}>{categories.length} categories</span>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            + Add Category
          </button>
        )}
      </div>
      {actionError && <p className="form-error" style={{ marginBottom: "12px" }}>{actionError}</p>}
      <div className="table-container">
        {loading ? <PageLoader /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Sort Order</th><th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 500 }}>{cat.name}</td>
                  <td style={{ color: "#888" }}>{cat.sort_order}</td>
                  <td>
                    <span className="badge" style={cat.is_active
                      ? { background: "#DCFCE7", color: "#166534" }
                      : { background: "#F3F4F6", color: "#9CA3AF" }}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-sm btn-secondary"
                          onClick={() => { setEditing(cat); setModalOpen(true); }}>Edit</button>
                        <button className="btn btn-sm"
                          style={cat.is_active
                            ? { background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }
                            : { background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC" }}
                          onClick={() => handleToggleActive(cat)}>
                          {cat.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} style={{ textAlign: "center", color: "#bbb", padding: "32px" }}>
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {modalOpen && (
        <CategoryFormModal
          category={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────────

function ProductsTab({ isAdmin, categories }) {
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterCat,   setFilterCat]   = useState("");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [actionError, setActionError] = useState("");

  // Sub-modals
  const [variantsProduct,  setVariantsProduct]  = useState(null);
  const [comboProduct,     setComboProduct]      = useState(null);

  useEffect(() => { fetchProducts(); }, [filterCat]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const qs   = filterCat ? `?category_id=${filterCat}` : "";
      const res  = await fetch(`/api/products${qs}`);
      const data = await res.json();
      setProducts(data.products || []);
    } finally {
      setLoading(false);
    }
  }

  async function patchProduct(product, field, value) {
    setActionError("");
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, [field]: value } : p)));
    const res  = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
    if (!res.ok) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, [field]: product[field] } : p)));
      const data = await res.json();
      setActionError(data.error || "Failed to update.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <select className="form-input" style={{ width: "200px" }}
          value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            + Add Product
          </button>
        )}
      </div>
      {actionError && <p className="form-error" style={{ marginBottom: "12px" }}>{actionError}</p>}

      <div className="table-container">
        {loading ? <PageLoader /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Category</th><th>Type</th><th>Price</th>
                <th>Available</th><th>Active</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>{p.slug}</div>
                  </td>
                  <td style={{ color: "#888" }}>{p.category_name || "—"}</td>
                  <td>
                    <span className="badge" style={TYPE_COLORS[p.type]}>{p.type}</span>
                  </td>
                  <td>{formatPrice(p.base_price)}</td>
                  <td>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={p.is_available}
                        onChange={() => patchProduct(p, "is_available", !p.is_available)} />
                      <span className="toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <span className="badge" style={p.is_active
                      ? { background: "#DCFCE7", color: "#166534" }
                      : { background: "#F3F4F6", color: "#9CA3AF" }}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {/* Variants button — variant products */}
                      {p.type === "variant" && (
                        <button className="btn btn-sm"
                          style={{ background: "#fff8f0", color: "#e67700", border: "1px solid #ffd8a8" }}
                          onClick={() => setVariantsProduct(p)}>
                          Variants
                        </button>
                      )}
                      {/* Combo items button — combo products */}
                      {p.type === "combo" && isAdmin && (
                        <button className="btn btn-sm"
                          style={{ background: "#f3f0ff", color: "#7048e8", border: "1px solid #d0bfff" }}
                          onClick={() => setComboProduct(p)}>
                          Items
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button className="btn btn-sm btn-secondary"
                            onClick={() => { setEditing(p); setModalOpen(true); }}>Edit</button>
                          <button className="btn btn-sm"
                            style={p.is_active
                              ? { background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }
                              : { background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC" }}
                            onClick={() => patchProduct(p, "is_active", !p.is_active)}>
                            {p.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "#bbb", padding: "32px" }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Product create/edit modal */}
      {modalOpen && (
        <ProductFormModal
          product={editing}
          categories={categories}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={async () => { await fetchProducts(); setModalOpen(false); setEditing(null); }}
        />
      )}

      {/* Variants modal */}
      {variantsProduct && (
        <VariantsModal
          product={variantsProduct}
          isAdmin={isAdmin}
          onClose={() => setVariantsProduct(null)}
        />
      )}

      {/* Combo items modal */}
      {comboProduct && (
        <ComboItemsModal
          product={comboProduct}
          allProducts={products}
          categories={categories}
          onClose={() => setComboProduct(null)}
        />
      )}
    </div>
  );
}

// ── Combo-Only Items Tab ──────────────────────────────────────────────────────

function ComboOnlyItemsTab() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [editName, setEditName] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const res  = await fetch("/api/combo-only-items");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    setAdding(true);
    const res  = await fetch("/api/combo-only-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), sort_order: 0 }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { setError(data.error || "Failed to add item."); return; }
    setItems((prev) => [...prev, data.item]);
    setNewName("");
  }

  async function handleSaveEdit(id) {
    if (!editName.trim()) return;
    setError("");
    setSaving(true);
    const res  = await fetch(`/api/combo-only-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), sort_order: 0 }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save."); return; }
    setItems((prev) => prev.map((i) => (i.id === id ? data.item : i)));
    setEditId(null);
    setEditName("");
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item? It will be removed from any combos that use it.")) return;
    const res = await fetch(`/api/combo-only-items/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span style={{ color: "#888", fontSize: "13px" }}>{items.length} items</span>
          <p style={{ fontSize: "12px", color: "#aaa", margin: "4px 0 0" }}>
            Items used only inside combos — not shown on the POS menu.
          </p>
        </div>
      </div>
      {error && <p className="form-error" style={{ marginBottom: "12px" }}>{error}</p>}

      <div className="table-container">
        {loading ? <PageLoader /> : (
          <table className="data-table">
            <thead>
              <tr><th>Item Name</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {editId === item.id ? (
                      <input
                        className="form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ maxWidth: "320px" }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editId === item.id ? (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleSaveEdit(item.id)} disabled={saving}>
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditId(null); setEditName(""); }}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditId(item.id); setEditName(item.name); }}>
                            Edit
                          </button>
                          <button className="btn btn-sm"
                            style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
                            onClick={() => handleDelete(item.id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", color: "#bbb", padding: "32px" }}>
                    No combo-only items yet. Add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Inline add form */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginTop: "16px" }}>
        <div className="form-group" style={{ flex: 1, maxWidth: "360px", margin: 0 }}>
          <label className="form-label">New Item Name</label>
          <input
            className="form-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. 8 Piece Chicken"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
          {adding ? "Adding..." : "+ Add Item"}
        </button>
      </form>
    </div>
  );
}


// ── Main Menu Page ────────────────────────────────────────────────────────────

export default function MenuPage() {
  const { user }                    = useAuth();
  const isAdmin                     = user?.role === "admin";
  const [activeTab, setActiveTab]   = useState("products");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, [activeTab]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Menu Management</h1>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}>
          Products
        </button>
        {isAdmin && (
          <>
            <button className={`tab-btn ${activeTab === "combo-items" ? "active" : ""}`}
              onClick={() => setActiveTab("combo-items")}>
              Combo Items
            </button>
            <button className={`tab-btn ${activeTab === "addons" ? "active" : ""}`}
              onClick={() => setActiveTab("addons")}>
              Add-ons
            </button>
            <button className={`tab-btn ${activeTab === "categories" ? "active" : ""}`}
              onClick={() => setActiveTab("categories")}>
              Categories
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        {activeTab === "products" && (
          <ProductsTab isAdmin={isAdmin} categories={categories} />
        )}
        {activeTab === "combo-items" && isAdmin && (
          <ComboOnlyItemsTab />
        )}
        {activeTab === "addons" && isAdmin && (
          <AddonsTab isAdmin={isAdmin} />
        )}
        {activeTab === "categories" && isAdmin && (
          <CategoriesTab isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
