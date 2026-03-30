import { query } from "../lib/db";

/**
 * Returns all settings rows as a plain { key: value } object.
 */
export async function getAllSettings() {
  const res = await query(`SELECT key, value FROM settings ORDER BY key ASC`);
  const map = {};
  for (const row of res.rows) map[row.key] = row.value;
  return map;
}

/**
 * Upserts multiple settings at once.
 * kvMap: { restaurant_name: "...", address: "...", ... }
 */
export async function upsertSettings(kvMap) {
  const entries = Object.entries(kvMap);
  if (entries.length === 0) return;

  // Build a single multi-row upsert
  const valuePlaceholders = entries.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, NOW())`).join(", ");
  const params = entries.flatMap(([k, v]) => [k, v]);

  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ${valuePlaceholders}
     ON CONFLICT (key) DO UPDATE
       SET value      = EXCLUDED.value,
           updated_at = NOW()`,
    params
  );
}
