import { query } from "../lib/db";

export async function getComboItems(comboId) {
  const result = await query(
    `SELECT ci.id, ci.combo_id, ci.product_id, ci.variant_id, ci.quantity,
            p.name       AS product_name,
            p.type       AS product_type,
            p.base_price AS product_base_price,
            pv.name      AS variant_name,
            pv.price     AS variant_price
     FROM   combo_items ci
     JOIN   products p         ON p.id  = ci.product_id
     LEFT JOIN product_variants pv ON pv.id = ci.variant_id
     WHERE  ci.combo_id = $1
     ORDER  BY p.name ASC, pv.name ASC`,
    [comboId]
  );
  return result.rows;
}

export async function addComboItem({ combo_id, product_id, variant_id, quantity }) {
  const result = await query(
    `INSERT INTO combo_items (combo_id, product_id, variant_id, quantity)
     VALUES ($1, $2, $3, $4)
     RETURNING id, combo_id, product_id, variant_id, quantity`,
    [combo_id, product_id, variant_id || null, parseInt(quantity) || 1]
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

// Check if the exact same product+variant combination is already in the combo.
// For simple products: variant_id is null — only one entry per product allowed.
// For variant products: each variant is a separate entry, so Pizza-Small and Pizza-Large can both be in a combo.
export async function isProductInCombo(comboId, productId, variantId) {
  const result = variantId
    ? await query(
        `SELECT id FROM combo_items
         WHERE combo_id = $1 AND product_id = $2 AND variant_id = $3
         LIMIT 1`,
        [comboId, productId, variantId]
      )
    : await query(
        `SELECT id FROM combo_items
         WHERE combo_id = $1 AND product_id = $2 AND variant_id IS NULL
         LIMIT 1`,
        [comboId, productId]
      );
  return result.rows.length > 0;
}
