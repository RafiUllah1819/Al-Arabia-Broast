import { useState, useEffect, useRef } from "react";

const PRODUCT_TYPES = ["simple", "variant", "combo"];

const EMPTY = {
  name: "", slug: "", barcode: "", description: "", category_id: "",
  type: "simple", base_price: "", sort_order: "0",
  is_available: true, is_active: true, is_kitchen_item: true,
};

function toSlug(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function ProductFormModal({ product, categories, onClose, onSaved }) {
  const isEditing = Boolean(product);

  const [form,   setForm]   = useState(EMPTY);
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  // Image state
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError,   setImageError]   = useState("");
  const fileInputRef = useRef(null);

  // Variant inline state
  const [variants,          setVariants]          = useState([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState(new Set());
  const [variantInput,      setVariantInput]      = useState({ name: "", price: "" });
  const [variantsLoading,   setVariantsLoading]   = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name:         product.name,
        slug:         product.slug || "",
        barcode:      product.barcode || "",
        description:  product.description || "",
        category_id:  product.category_id ? String(product.category_id) : "",
        type:         product.type,
        base_price:   product.base_price != null ? String(product.base_price) : "",
        sort_order:      String(product.sort_order),
        is_available:    product.is_available,
        is_active:       product.is_active,
        is_kitchen_item: product.is_kitchen_item !== false,
      });
      setImagePreview(product.image_url || "");
      setImageFile(null);
      setImageError("");

      if (product.type === "variant") {
        loadVariants(product.id);
      } else {
        setVariants([]);
      }
    } else {
      setForm(EMPTY);
      setImagePreview("");
      setImageFile(null);
      setImageError("");
      setVariants([]);
    }
    setDeletedVariantIds(new Set());
    setVariantInput({ name: "", price: "" });
    setError("");
  }, [product]);

  async function loadVariants(productId) {
    setVariantsLoading(true);
    try {
      const res  = await fetch(`/api/variants?product_id=${productId}`);
      const data = await res.json();
      setVariants(
        (data.variants || []).map((v) => ({ id: v.id, name: v.name, price: String(v.price) }))
      );
    } catch {
      // leave empty on error
    } finally {
      setVariantsLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setForm((prev) => {
      const updated = { ...prev, [name]: newValue };
      if (name === "name" && !isEditing && prev.slug === toSlug(prev.name)) {
        updated.slug = toSlug(value);
      }
      return updated;
    });
    // Clear variants when switching type away from variant
    if (name === "type" && value !== "variant") {
      setVariants([]);
      setDeletedVariantIds(new Set());
    }
  }

  function handleNameBlur() {
    if (!isEditing && !form.slug) {
      setForm((prev) => ({ ...prev, slug: toSlug(prev.name) }));
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file (JPG, PNG, WebP, or GIF).");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageError("");
  }

  function addVariant() {
    const name  = variantInput.name.trim();
    const price = parseFloat(variantInput.price);
    if (!name || isNaN(price) || price < 0) return;
    setVariants((prev) => [...prev, { id: null, name, price: String(price) }]);
    setVariantInput({ name: "", price: "" });
  }

  function removeVariant(index) {
    const v = variants[index];
    if (v.id) {
      setDeletedVariantIds((prev) => new Set([...prev, v.id]));
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validate image
    if (!imageFile && !imagePreview) {
      setImageError("Product image is required.");
      return;
    }

    setSaving(true);

    try {
      // 1. Upload image if a new file was selected
      let imageUrl = imagePreview;
      if (imageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload  = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        const uploadRes = await fetch("/api/upload/product-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, filename: imageFile.name, mimeType: imageFile.type }),
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          setImageError(err.error || "Failed to upload image.");
          setSaving(false);
          return;
        }
        const { url } = await uploadRes.json();
        imageUrl = url;
      }

      // 2. Save / update product
      const url    = isEditing ? `/api/products/${product.id}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image_url: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); setSaving(false); return; }

      const savedProduct = data.product;

      // 3. Sync variants for variant-type products
      if (form.type === "variant") {
        const newVariants = variants.filter((v) => !v.id);
        await Promise.all([
          ...newVariants.map((v) =>
            fetch("/api/variants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                product_id: savedProduct.id,
                name:       v.name,
                price:      parseFloat(v.price),
              }),
            })
          ),
          ...[...deletedVariantIds].map((vid) =>
            fetch(`/api/variants/${vid}`, { method: "DELETE" })
          ),
        ]);
      }

      onSaved(savedProduct, isEditing);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? "Edit Product" : "Add Product"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="product-form-grid">

              {/* ── Left column: metadata ─────────────────────────────── */}
              <div className="product-form-col">
                <div className="form-group">
                  <label className="form-label">
                    Product Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleNameBlur}
                    placeholder="e.g. Classic Burger"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Barcode <span className="form-hint">— optional</span>
                  </label>
                  <input
                    className="form-input"
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="e.g. 123456789"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                  >
                    <option value="">— No category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Type</label>
                  <select
                    className="form-input"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    required
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Description <span className="form-hint">— optional</span>
                  </label>
                  <textarea
                    className="form-input"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Short description"
                    rows={2}
                    style={{ resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "16px", marginTop: "4px", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" name="is_available" checked={form.is_available} onChange={handleChange} />
                    Available
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                    Active
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" name="is_kitchen_item" checked={form.is_kitchen_item} onChange={handleChange} />
                    Kitchen Item
                  </label>
                </div>
              </div>

              {/* ── Middle column: pricing / variants ────────────────── */}
              <div className="product-form-col">
                {form.type === "simple" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">
                        Base Price <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        type="number"
                        name="base_price"
                        value={form.base_price}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
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
                        min="0"
                      />
                    </div>
                  </>
                )}

                {form.type === "variant" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Variants</label>
                      {variantsLoading ? (
                        <p style={{ color: "#999", fontSize: "13px", marginTop: "6px" }}>Loading variants...</p>
                      ) : (
                        <>
                          <div className="variant-list">
                            {variants.length === 0 && (
                              <p style={{ color: "#bbb", fontSize: "12px", margin: "8px 0" }}>
                                No variants yet. Add one below.
                              </p>
                            )}
                            {variants.map((v, i) => (
                              <div key={i} className="variant-row">
                                <span className="variant-name">{v.name}</span>
                                <span className="variant-price">
                                  Rs. {parseFloat(v.price).toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  className="variant-remove"
                                  onClick={() => removeVariant(i)}
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="variant-add-row">
                            <input
                              className="form-input"
                              placeholder="Variant name"
                              value={variantInput.name}
                              onChange={(e) =>
                                setVariantInput((p) => ({ ...p, name: e.target.value }))
                              }
                              style={{ flex: 2, minWidth: 0 }}
                            />
                            <input
                              className="form-input"
                              type="number"
                              placeholder="Price"
                              value={variantInput.price}
                              onChange={(e) =>
                                setVariantInput((p) => ({ ...p, price: e.target.value }))
                              }
                              min="0"
                              step="0.01"
                              style={{ flex: 1, minWidth: 0 }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={addVariant}
                              disabled={!variantInput.name.trim() || !variantInput.price}
                            >
                              + Add
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sort Order</label>
                      <input
                        className="form-input"
                        type="number"
                        name="sort_order"
                        value={form.sort_order}
                        onChange={handleChange}
                        min="0"
                        style={{ maxWidth: "120px" }}
                      />
                    </div>
                  </>
                )}

                {form.type === "combo" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">
                        Combo Selling Price <span style={{ color: "#EF4444" }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        type="number"
                        name="base_price"
                        value={form.base_price}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                      <span className="form-hint" style={{ fontSize: "11px", color: "#999", marginTop: "4px", display: "block" }}>
                        Final price the customer pays for this combo deal
                      </span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sort Order</label>
                      <input
                        className="form-input"
                        type="number"
                        name="sort_order"
                        value={form.sort_order}
                        onChange={handleChange}
                        min="0"
                        style={{ maxWidth: "120px" }}
                      />
                    </div>
                  </>
                )}

                <div className="form-group" style={{ marginTop: "12px" }}>
                  <label className="form-label">
                    Slug <span className="form-hint">— auto-generated from name</span>
                  </label>
                  <input
                    className="form-input"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="auto-generated from name"
                  />
                </div>
              </div>

              {/* ── Right column: image ───────────────────────────────── */}
              <div className="product-form-col product-form-image-col">
                <label className="form-label">
                  Product Image <span style={{ color: "#EF4444" }}>*</span>
                </label>

                <div className="product-img-upload-box">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }}
                    />
                  ) : (
                    <div className="product-img-placeholder">
                      <span style={{ fontSize: "36px" }}>🖼</span>
                      <span style={{ fontSize: "12px", color: "#bbb", marginTop: "8px" }}>
                        No image selected
                      </span>
                    </div>
                  )}
                </div>

                <label
                  className="btn btn-secondary"
                  style={{ display: "block", textAlign: "center", cursor: "pointer", marginTop: "8px" }}
                >
                  Browse / Upload
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>

                {imagePreview && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      background: "#FEF2F2",
                      color: "#EF4444",
                      border: "1px solid #FECACA",
                    }}
                    onClick={() => { setImageFile(null); setImagePreview(""); }}
                  >
                    Remove Image
                  </button>
                )}

                {imageError && (
                  <p className="form-error" style={{ marginTop: "6px" }}>{imageError}</p>
                )}
              </div>

            </div>

            {error && <p className="form-error" style={{ marginTop: "12px" }}>{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
