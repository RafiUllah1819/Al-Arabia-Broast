/**
 * lib/receipt.js — Thermal receipt system
 *
 * Four-layer architecture:
 *
 *   Layer 1 — Content builders  (pure functions, zero side effects)
 *     buildReceiptCSS()                     → CSS string
 *     buildReceiptHTML(order, settings)     → receipt body HTML string
 *
 *   Layer 2 — Document assembly  (combines layers 1 into a print-ready object)
 *     buildReceiptDocument(order, settings) → { title, html, css }
 *
 *   Layer 3 — Print drivers  (all side effects live here, one function per output method)
 *     PRINT_DRIVERS.browserPopup(doc)       → opens popup + browser print dialog  ← active now
 *     PRINT_DRIVERS.silentBridge(doc)       → stub, ready to wire to QZ Tray / Electron / local server
 *
 *   Layer 4 — Public entry point  (what the rest of the app calls)
 *     printReceipt(order, settings, driver?) → resolves driver, assembles doc, calls driver
 *
 * ─── To add silent / direct printing later ───────────────────────────────────
 *   1. Implement PRINT_DRIVERS.silentBridge (or add a new driver key).
 *   2. Either:
 *      a. Call  printReceipt(order, settings, "silentBridge")  per call-site, or
 *      b. Change DEFAULT_DRIVER to "silentBridge" to switch the whole app at once.
 *   Nothing else in the codebase needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Layer 1 — Content builders
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtReceiptDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtReceiptTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

/** Escapes HTML special chars in generated strings to prevent injection. */
function esc(val) {
  if (val == null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ORDER_TYPE_LABEL = {
  "dine-in":  "Dine In",
  "takeaway": "Takeaway",
  "delivery": "Delivery",
};

// ── CSS builder ───────────────────────────────────────────────────────────────

/**
 * buildReceiptCSS()
 *
 * Returns the complete CSS string for an 80mm thermal receipt.
 * Thermal-safe: no background colors, no border-radius on the receipt itself,
 * Courier New font (printer-standard monospace), black ink only.
 *
 * Swap this function to change visual style without touching HTML or print logic.
 */
export function buildReceiptCSS() {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  background: #e8e8e8;
  padding: 16px 8px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Screen-only print trigger button ── */
.print-btn {
  width: 272px;
  margin-bottom: 12px;
  padding: 8px 0;
  background: #fff;
  color: #222;
  border: 1.5px solid #333;
  border-radius: 4px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.print-btn:hover { background: #222; color: #fff; }

/* ── Thermal paper rules ── */
@page {
  size: 80mm auto;   /* 80mm width, height follows content */
  margin: 5mm 4mm;
}
@media print {
  .print-btn { display: none; }
  body { background: white; padding: 0; margin: 0; display: block; }
  .rct-wrap { width: 100%; border: none; box-shadow: none; padding: 0; }
}

/* ── Receipt wrapper ── */
.rct-wrap {
  width: 272px;                           /* 80mm at 96dpi minus 4mm margins each side */
  background: white;
  padding: 14px 12px 16px;
  border: 1px solid #ccc;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  font-weight: bold;
  color: #111;
  line-height: 1.4;
}

/* ── Logo ── */
.rct-logo-box { text-align: center; margin-bottom: 8px; }
.rct-logo-img { width: 64px; height: 64px; object-fit: contain; }

/* ── Header ── */
.rct-name {
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.25;
  margin-bottom: 4px;
}
.rct-addr {
  text-align: center;
  font-size: 13px;
  color: #000;
  line-height: 1.5;
  margin-bottom: 2px;
}
.rct-phone {
  text-align: center;
  font-size: 13px;
  color: #000;
  font-weight: bold;
}

/* ── Separators ── */
.sep-dash  { border: none; border-top: 1px dashed #000; margin: 7px 0; }
.sep-solid { border: none; border-top: 1px solid #000;  margin: 5px 0; }

/* ── Section label ── */
.rct-section-title {
  text-align: center;
  font-size: 13px;
  letter-spacing: 3px;
  color: #000;
  text-transform: uppercase;
  margin-bottom: 7px;
}

/* ── Two-column label/value rows ── */
.rct-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 3px;
}
.rct-row .lbl { color: #000; min-width: 54px; flex-shrink: 0; }
.rct-row .val { text-align: right; flex: 1; word-break: break-word; }

/* ── Items table ── */
.rct-items-hdr {
  display: flex;
  font-size: 13px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #222;
  margin-bottom: 6px;
}
.cn  { flex: 1; }
.cq  { width: 20px; text-align: center; }
.cr  { width: 80px; text-align: right; }
.ct  { width: 58px; text-align: right; padding-left: 14px; }

.rct-item { display: flex; align-items: flex-start; font-size: 13px; margin-bottom: 5px; }
.rct-item .cn { line-height: 1.3; padding-right: 4px; }
.rct-item .cn .var { display: block; font-size: 13px; color: #000; margin-top: 1px; }
.rct-item .cq { color: #000; font-size: 13px; padding-top: 1px; }
.rct-item .cr { color: #000; font-size: 13px; padding-top: 1px; }
.rct-item .ct { font-weight: bold; font-size: 13px; }

.rct-combo-line {
  font-size: 13px;
  color: #000;
  padding-left: 10px;
  margin-top: -2px;
  margin-bottom: 1px;
}

.rct-addon {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #000;
  padding-left: 10px;
  margin-top: -3px;
  margin-bottom: 4px;
}

/* ── Totals ── */
.rct-subtotal {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #000;
  margin-bottom: 3px;
}

/* Grand total: double-rule — thermal-safe, no background color */
.rct-grand-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 5px 0;
  border-top: 2px solid #111;
  border-bottom: 2px solid #111;
  margin: 3px 0 8px;
}
.rct-grand-total .gt-lbl {
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.rct-grand-total .gt-amt { font-size: 16px; font-weight: bold; }

/* ── Footer ── */
.rct-footer-msg  { text-align: center; font-size: 13px; color: #000; margin-bottom: 3px; }
.rct-footer-phone { text-align: center; font-size: 13px; color: #000; margin-top: 2px; }
  `.trim();
}

// ── HTML builder ──────────────────────────────────────────────────────────────

/**
 * buildReceiptHTML(order, settings)
 *
 * Returns the receipt body as a plain HTML string.
 * Pure function — no DOM access, no React, no side effects.
 * Safe to call server-side, in a Web Worker, or from a Node script.
 *
 * Swap this function to change receipt content/layout without touching
 * CSS or print logic.
 */
export function buildReceiptHTML(order, settings) {
  const sym     = settings?.currency_symbol || "Rs.";
  const rName   = esc(settings?.restaurant_name || "");
  const address = esc(settings?.address || "");
  const phone   = esc(settings?.phone || "");
  const footer  = esc(settings?.receipt_footer || "Thank you for your order!");

  const subtotal = (order.items || []).reduce((sum, item) => {
    const addonSum = (item.addons || []).reduce((s, a) => s + a.price * item.quantity, 0);
    return sum + item.line_total + addonSum;
  }, 0);

  const logoBlock = settings?.restaurant_logo
    ? `<div class="rct-logo-box"><img src="${esc(settings.restaurant_logo)}" alt="Logo" class="rct-logo-img"></div>`
    : "";

  function row(label, value) {
    if (!value) return "";
    return `<div class="rct-row"><span class="lbl">${label}</span><span class="val">${esc(String(value))}</span></div>`;
  }

  const typeLabel      = ORDER_TYPE_LABEL[order.type] || esc(order.type);
  const paymentDisplay = order.payment_method
    ? order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)
    : order.type === "delivery" ? "Cash on Delivery" : "—";

  const itemsBlock = (order.items || []).map((item) => {
    const addonSum  = (item.addons || []).reduce((s, a) => s + a.price, 0);
    const lineTotal = (item.line_total + addonSum * item.quantity).toFixed(2);
    const varSpan   = item.variant_name ? `<span class="var">${esc(item.variant_name)}</span>` : "";
    const addonsHTML = (item.addons || []).map((a) =>
      `<div class="rct-addon"><span>+ ${esc(a.name)}</span><span>+${sym}${(a.price * item.quantity).toFixed(2)}</span></div>`
    ).join("");
    const comboHTML = (item.combo_contents || []).map((c) =>
      `<div class="rct-combo-line">&middot; ${esc(c.name)}${c.quantity > 1 ? ` x${c.quantity}` : ""}</div>`
    ).join("");
    return `
<div class="rct-item">
  <span class="cn">${esc(item.product_name)}${varSpan}</span>
  <span class="cq">${item.quantity}</span>
  <span class="cr">${sym}${item.unit_price.toFixed(2)}</span>
</div>${comboHTML}${addonsHTML}`;
  }).join("");

  const paidBlock   = parseFloat(order.payment_amount || 0) > 0
    ? row("Paid", `${sym}${parseFloat(order.payment_amount).toFixed(2)}`) : "";
  const changeBlock = order.payment_method === "cash" && parseFloat(order.change_due || 0) > 0
    ? row("Change", `${sym}${parseFloat(order.change_due).toFixed(2)}`) : "";
  const refBlock    = order.payment_reference ? row("Ref #", order.payment_reference) : "";

  return `
<div class="rct-wrap">
  ${logoBlock}
  <div class="rct-name">${rName}</div>
  ${address ? `<div class="rct-addr">${address}</div>` : ""}
  ${phone   ? `<div class="rct-phone">${phone}</div>`   : ""}

  <div class="sep-dash"></div>
  <div class="rct-section-title">R E C E I P T</div>

  ${row("Bill #",   order.order_number)}
  ${row("Date",     `${fmtReceiptDate(order.created_at)}  ${fmtReceiptTime(order.created_at)}`)}
  ${row("Type",     typeLabel)}
  ${order.table_name       ? row("Table",    order.table_name)       : ""}
  ${order.waiter_name      ? row("Waiter",   order.waiter_name)      : ""}
  ${order.customer_name    ? row("Customer", order.customer_name)    : ""}
  ${order.customer_phone   ? row("Phone",    order.customer_phone)   : ""}
  ${order.customer_address ? row("Address",  order.customer_address) : ""}

  <div class="sep-dash"></div>

  <div class="rct-items-hdr">
    <span class="cn">Item</span><span class="cq">Qty</span>
    <span class="cr">Rate</span>
  </div>

  ${itemsBlock}

  <div class="rct-grand-total">
    <span class="gt-lbl">Total</span>
    <span class="gt-amt">${sym}${parseFloat(order.total).toFixed(2)}</span>
  </div>

  ${row("Payment", paymentDisplay)}
  ${paidBlock}
  ${changeBlock}
  ${refBlock}

  <div class="sep-dash"></div>
  <div class="rct-footer-msg">${footer}</div>
  ${phone ? `<div class="rct-footer-phone">${phone}</div>` : ""}
</div>`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Layer 2 — Document assembly
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildReceiptDocument(order, settings)
 *
 * Assembles the content builders into a print-ready document object.
 * Drivers receive this object — they don't call the builders directly.
 *
 * Shape: { title: string, html: string, css: string, page: string }
 *   title — document/file title (used as PDF filename)
 *   html  — receipt body only (useful for raw-text or ESC/POS drivers)
 *   css   — stylesheet string (useful for custom render pipelines)
 *   page  — complete, self-contained HTML document string ready to write/send
 */
function buildReceiptDocument(order, settings) {
  const title = `Receipt-${order?.order_number || "Bill"}`;
  const html  = buildReceiptHTML(order, settings);
  const css   = buildReceiptCSS();
  const page  = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print Bill</button>
${html}
</body>
</html>`;
  return { title, html, css, page };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Layer 3 — Print drivers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PRINT_DRIVERS
 *
 * Each driver is a function: (doc) => void
 * where doc = { title, html, css, page } from buildReceiptDocument().
 *
 * Drivers are the only place that produce side effects (opening windows,
 * talking to printers, sending HTTP requests, calling native APIs).
 *
 * ─── Adding a new driver ─────────────────────────────────────────────────────
 * Add a new key here. The driver receives the full doc object and decides
 * what to do with it. Examples of future drivers are shown as comments below.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const PRINT_DRIVERS = {

  /**
   * browserPopup — active default driver
   *
   * Opens a new browser window containing the full receipt page and
   * triggers the browser print dialog. Requires popup permission.
   * Works in any browser with no extra software.
   */
  browserPopup(doc) {
    const win = window.open("", "_blank", "width=340,height=680,scrollbars=yes");
    if (!win) {
      alert("Please allow popups for this site to print bills.");
      return;
    }
    win.document.write(doc.page);
    win.document.close();
    win.focus();
  },

  /**
   * silentBridge — stub for future direct thermal printing
   *
   * Intended for: QZ Tray, Electron IPC, a localhost print server,
   * or a WebUSB connection to an 80mm thermal printer.
   *
   * To activate:
   *   1. Install and configure your bridge (QZ Tray, custom server, etc.)
   *   2. Replace the console.warn below with the real integration code.
   *   3. Change DEFAULT_DRIVER to "silentBridge" (or pass it per call).
   *
   * The driver has access to:
   *   doc.html  — receipt body HTML  (good for QZ Tray HTML rendering)
   *   doc.page  — full HTML document (good for headless Chrome / Puppeteer)
   *   doc.css   — stylesheet string  (if the bridge needs it separately)
   *   doc.title — receipt title / filename
   *
   * For raw ESC/POS support, add buildReceiptText(order, settings) in
   * Layer 1 and pass the result through a separate doc field.
   */
  silentBridge(doc) {
    // Not yet implemented — falls back to browserPopup
    console.warn("[receipt] silentBridge driver is not configured. Falling back to browserPopup.");
    PRINT_DRIVERS.browserPopup(doc);
  },

};

// ═══════════════════════════════════════════════════════════════════════════════
// Layer 4 — Public entry point
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DEFAULT_DRIVER
 *
 * The driver used when printReceipt() is called without an explicit driver.
 * Change this single constant to switch the entire app to a different output.
 */
const DEFAULT_DRIVER = "browserPopup";

/**
 * printReceipt(order, settings, driver?)
 *
 * The single public function for the rest of the app to call.
 * Assembles the document and dispatches to the specified (or default) driver.
 *
 * @param {object} order    — order object from the API (with items + payment)
 * @param {object} settings — restaurant settings (name, address, logo, etc.)
 * @param {string} [driver] — key from PRINT_DRIVERS, defaults to DEFAULT_DRIVER
 */
export function printReceipt(order, settings, driver = DEFAULT_DRIVER) {
  if (!PRINT_DRIVERS[driver]) {
    console.error(`[receipt] Unknown print driver: "${driver}". Available: ${Object.keys(PRINT_DRIVERS).join(", ")}`);
    return;
  }
  const doc = buildReceiptDocument(order, settings);
  PRINT_DRIVERS[driver](doc);
}
