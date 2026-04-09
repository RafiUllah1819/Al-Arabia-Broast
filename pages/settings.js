import { useState, useEffect, useRef } from "react";
import PageLoader from "../components/ui/PageLoader";
import { SETTINGS_SCHEMA } from "../lib/settingsSchema";
import QRCode from "qrcode";

export default function SettingsPage() {
  const [form,    setForm]    = useState(() => {
    const init = {};
    for (const f of SETTINGS_SCHEMA) init[f.key] = f.default;
    return init;
  });
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [error,         setError]         = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError,     setLogoError]     = useState("");
  const [qrDataUrl,     setQrDataUrl]     = useState("");
  const [appUrl,        setAppUrl]        = useState("");
  const logoInputRef = useRef(null);

  // ── Generate QR code from the app's base URL ───────────────────────────────
  useEffect(() => {
    const url = window.location.origin;
    setAppUrl(url);
    QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: "#14213D", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, []);

  // ── Load settings ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setForm((prev) => ({ ...prev, ...data.settings }));
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess(false);
    const res  = await fetch("/api/settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save settings."); return; }
    setForm((prev) => ({ ...prev, ...data.settings }));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (success) setSuccess(false);
  }

  // ── Logo upload ────────────────────────────────────────────────────────────

  function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setLogoUploading(true);
      try {
        const res  = await fetch("/api/upload/restaurant-logo", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            base64:   ev.target.result,
            filename: file.name,
            mimeType: file.type,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setLogoError(data.error || "Upload failed."); return; }
        handleChange("restaurant_logo", data.url);
      } catch {
        setLogoError("Upload failed. Please try again.");
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <PageLoader />;
  }

  const sym = form.currency_symbol || "Rs.";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-layout">
        <form onSubmit={handleSubmit} className="settings-form-card">
          <div className="settings-section-title">Restaurant Profile</div>

          {SETTINGS_SCHEMA.map((field) => {
            /* ── Logo upload field ── */
            if (field.type === "image") {
              return (
                <div className="form-group" key={field.key}>
                  <label className="form-label">
                    {field.label}
                    {field.hint && <span className="form-hint"> — {field.hint}</span>}
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {form[field.key] ? (
                      <img
                        src={form[field.key]}
                        alt="Logo"
                        style={{
                          width: 64, height: 64, objectFit: "contain",
                          border: "1px solid #eee", borderRadius: 6, background: "#fafafa",
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 64, height: 64, background: "#f5f5f5",
                        border: "2px dashed #ddd", borderRadius: 6,
                        display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 24, color: "#ccc",
                      }}>
                        🏪
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleLogoFile}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                      >
                        {logoUploading ? "Uploading…" : "Upload Logo"}
                      </button>
                      {form[field.key] && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
                          onClick={() => handleChange(field.key, "")}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {logoError && <p className="form-error" style={{ marginTop: 6 }}>{logoError}</p>}
                </div>
              );
            }

            /* ── Regular text / textarea field ── */
            return (
              <div className="form-group" key={field.key}>
                <label className="form-label">
                  {field.label}
                  {field.required && <span style={{ color: "#EF476F", marginLeft: "3px" }}>*</span>}
                  {field.hint && <span className="form-hint"> — {field.hint}</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    className="form-input settings-textarea"
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    rows={3}
                    placeholder={field.default}
                  />
                ) : (
                  <input
                    className="form-input"
                    style={field.key === "currency_symbol" ? { maxWidth: "80px" } : undefined}
                    type="text"
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.default}
                    required={field.required}
                  />
                )}
              </div>
            );
          })}

          {error   && <p className="form-error">{error}</p>}
          {success && (
            <p style={{ color: "#22C55E", fontSize: "13px", fontWeight: 500 }}>
              Settings saved successfully.
            </p>
          )}
          <div style={{ marginTop: "8px" }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </form>

        {/* ── Live receipt preview ── */}
        <div className="settings-preview-card">
          <div className="settings-section-title">Receipt Preview</div>
          <div className="receipt-preview">
            {form.restaurant_logo && (
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <img
                  src={form.restaurant_logo}
                  alt="Logo"
                  style={{ maxWidth: 56, maxHeight: 56, objectFit: "contain" }}
                />
              </div>
            )}
            <div className="rp-name">{form.restaurant_name || "Restaurant Name"}</div>
            {form.address && <div className="rp-meta">{form.address}</div>}
            {form.phone   && <div className="rp-meta">{form.phone}</div>}

            <div className="rp-sep" />

            <div className="rp-info-row"><span>Bill #</span><span>ORD-0001</span></div>
            <div className="rp-info-row"><span>Date</span><span>Mar 29, 2026</span></div>
            <div className="rp-info-row"><span>Type</span><span>Dine In</span></div>
            <div className="rp-info-row"><span>Table</span><span>Table 3</span></div>

            <div className="rp-sep" />

            <div className="rp-items-hdr">
              <span style={{ flex: 1 }}>Item</span>
              <span style={{ width: 26, textAlign: "center" }}>Qty</span>
              <span style={{ width: 62, textAlign: "right" }}>Amt</span>
            </div>
            <div className="rp-item-row">
              <span style={{ flex: 1 }}>Broast (1/4)</span>
              <span style={{ width: 26, textAlign: "center" }}>1</span>
              <span style={{ width: 62, textAlign: "right" }}>{sym}250.00</span>
            </div>
            <div className="rp-item-row">
              <span style={{ flex: 1 }}>Pizza Large</span>
              <span style={{ width: 26, textAlign: "center" }}>2</span>
              <span style={{ width: 62, textAlign: "right" }}>{sym}1300.00</span>
            </div>

            <div className="rp-sep" />

            <div className="rp-info-row" style={{ color: "#999" }}><span>Subtotal</span><span>{sym}1550.00</span></div>
            <div className="rp-info-row" style={{ color: "#999" }}><span>Tax (10%)</span><span>{sym}155.00</span></div>
            <div className="rp-total-row"><span>TOTAL</span><span>{sym}1705.00</span></div>

            <div className="rp-sep" />

            <div className="rp-info-row"><span>Payment</span><span>Cash</span></div>
            <div className="rp-info-row"><span>Paid</span><span>{sym}2000.00</span></div>
            <div className="rp-info-row"><span>Change</span><span>{sym}295.00</span></div>

            <div className="rp-sep" />
            <div className="rp-footer">{form.receipt_footer || "Thank you for your order!"}</div>
            {form.phone && <div className="rp-footer-phone">{form.phone}</div>}
          </div>
        </div>
      </div>

      {/* ── QR Code Card ── */}
      {qrDataUrl && (
        <div style={{
          marginTop: "24px",
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: "32px",
          flexWrap: "wrap",
        }}>
          {/* QR image */}
          <div style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            padding: "12px",
            display: "inline-flex",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>
            <img src={qrDataUrl} alt="App QR Code" style={{ width: 160, height: 160, display: "block" }} />
          </div>

          {/* Info + actions */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>
              Open on Mobile / Tablet
            </div>
            <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "12px", lineHeight: 1.6 }}>
              Scan this QR code with any phone or tablet camera to instantly open the app — no typing needed. Works for all roles (Admin, Manager, Waiter, Cashier).
            </div>
            <div style={{
              background: "#F6F7FB",
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              padding: "8px 12px",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "#374151",
              wordBreak: "break-all",
              marginBottom: "14px",
            }}>
              {appUrl}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
