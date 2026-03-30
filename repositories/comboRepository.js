import { query } from "../lib/db";

export async function getComboItems(comboId) {
  const result = await query(
    `SELECT ci.id, ci.combo_id, ci.product_id, ci.variant_id, ci.combo_only_item_id, ci.quantity,
            p.name   AS product_name,
            p.type   AS product_type,
            pv.name  AS variant_name,
            coi.name AS combo_only_item_name
     FROM   combo_items ci
     LEFT JOIN products          p   ON p.id   = ci.product_id
     LEFT JOIN product_variants  pv  ON pv.id  = ci.variant_id
     LEFT JOIN combo_only_items  coi ON coi.id = ci.combo_only_item_id
     WHERE  ci.combo_id = $1
     ORDER  BY ci.id ASC`,
    [comboId]
  );
  return result.rows;
}

export async function addComboItem({ combo_id, product_id, variant_id, combo_only_item_id, quantity }) {
  const result = await query(
    `INSERT INTO combo_items (combo_id, product_id, variant_id, combo_only_item_id, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, combo_id, product_id, variant_id, combo_only_item_id, quantity`,
    [combo_id, product_id || null, variant_id || null, combo_only_item_id || null, parseInt(quantity) || 1]
  );
  return result.rows[0];
}

export async function updateComboItemQuantity(id, quantity) {
  const result = await query(
    `UPDATE combo_items SET quantity = $1 WHERE id = $2
     RETURNING id, quantity`,
    [parseInt(quantity) || 1, id]
  );
  return result.rows[0];
}

export async function removeComboItem(id) {
  await query("DELETE FROM combo_items WHERE id = $1", [id]);
}

// Check if the exact product+variant is already in the combo
export async function isProductInCombo(comboId, productId, variantId) {
  const result = variantId
    ? await query(
        `SELECT id FROM combo_items WHERE combo_id = $1 AND product_id = $2 AND variant_id = $3 LIMIT 1`,
        [comboId, productId, variantId]
      )
    : await query(
        `SELECT id FROM combo_items WHERE combo_id = $1 AND product_id = $2 AND variant_id IS NULL LIMIT 1`,
        [comboId, productId]
      );
  return result.rows.length > 0;
}

// Check if the exact combo-only item is already in the combo
export async function isComboOnlyItemInCombo(comboId, comboOnlyItemId) {
  const result = await query(
    `SELECT id FROM combo_items WHERE combo_id = $1 AND combo_only_item_id = $2 LIMIT 1`,
    [comboId, comboOnlyItemId]
  );
  return result.rows.length > 0;
}
