import { getAllSettings, upsertSettings } from "../repositories/settingsRepository";
import { SETTINGS_SCHEMA } from "../lib/settingsSchema";
export { SETTINGS_SCHEMA };

const ALLOWED_KEYS = new Set(SETTINGS_SCHEMA.map((s) => s.key));

/**
 * Returns all settings as a flat object, filling in defaults for any missing keys.
 * Shape: { restaurant_name: "...", address: "...", ... }
 */
export async function getSettings() {
  const stored = await getAllSettings();
  const result = {};
  for (const field of SETTINGS_SCHEMA) {
    result[field.key] = stored[field.key] ?? field.default;
  }
  return result;
}

/**
 * Validate and persist a settings update.
 * Only keys present in SETTINGS_SCHEMA are accepted — unknown keys are silently dropped.
 * Returns the updated settings object.
 */
export async function updateSettings(data) {
  const toSave = {};

  for (const field of SETTINGS_SCHEMA) {
    if (!(field.key in data)) continue;

    const value = String(data[field.key] ?? "").trim();

    if (field.required && !value) {
      const e = new Error(`"${field.label}" is required.`);
      e.status = 400;
      throw e;
    }

    toSave[field.key] = value;
  }

  if (Object.keys(toSave).length === 0) {
    const e = new Error("No valid fields provided.");
    e.status = 400;
    throw e;
  }

  await upsertSettings(toSave);
  return getSettings();
}
