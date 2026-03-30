import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import CategoryFormModal from "../components/menu/CategoryFormModal";
import ProductFormModal  from "../components/menu/ProductFormModal";
import VariantsModal     from "../components/menu/VariantsModal";
import ComboItemsModal   from "../components/menu/ComboItemsModal";
import AddonsTab         from "../components/menu/AddonsTab";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  simple:  { background: "#f0f4ff", color: "#3b5bdb" },
  variant: { background: "#fff8f0", color: "#e67700" },
  combo:   { background: "#f3f0ff", color: "#7048e8" },
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
        {loading ? <p style={{ padding: "24px", color: "#999" }}>Loading...</p> : (
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
                      ? { background: "#f0fff4", color: "#2f9e44" }
                      : { background: "#f5f5f5", color: "#aaa" }}>
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
                            ? { background: "#fff3f3", color: "#e03131", border: "1px solid #ffc9c9" }
                            : { background: "#f0fff4", color: "#2f9e44", border: "1px solid #b2f2bb" }}
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
        {loading ? <p style={{ padding: "24px", color: "#999" }}>Loading...</p> : (
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
                      ? { background: "#f0fff4", color: "#2f9e44" }
                      : { background: "#f5f5f5", color: "#aaa" }}>
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
                              ? { background: "#fff3f3", color: "#e03131", border: "1px solid #ffc9c9" }
                              : { background: "#f0fff4", color: "#2f9e44", border: "1px solid #b2f2bb" }}
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
          onSaved={() => { fetchProducts(); setModalOpen(false); setEditing(null); }}
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
  }, []);

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
