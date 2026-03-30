/**
 * Client-safe settings schema — no server imports.
 * Imported by both pages/settings.js (browser) and services/settingsService.js (server).
 */
export const SETTINGS_SCHEMA = [
  {
    key:      "restaurant_name",
    label:    "Restaurant Name",
    hint:     "Shown on receipts and throughout the app.",
    required: true,
    default:  "My Restaurant",
    type:     "text",
  },
  {
    key:      "address",
    label:    "Address",
    hint:     "Full address printed on receipts.",
    required: false,
    default:  "",
    type:     "text",
  },
  {
    key:      "phone",
    label:    "Phone Number",
    hint:     "Contact number printed on receipts.",
    required: false,
    default:  "",
    type:     "text",
  },
  {
    key:      "restaurant_logo",
    label:    "Restaurant Logo",
    hint:     "Upload a logo image to display on receipts.",
    required: false,
    default:  "",
    type:     "image",
  },
  {
    key:      "currency_symbol",
    label:    "Currency Symbol",
    hint:     "e.g. Rs., $, £, €  — displayed next to all prices.",
    required: true,
    default:  "Rs.",
    type:     "text",
  },
  {
    key:      "receipt_footer",
    label:    "Receipt Footer",
    hint:     "Message printed at the bottom of every receipt.",
    required: false,
    default:  "Thank you for your order!",
    type:     "textarea",
  },
];
