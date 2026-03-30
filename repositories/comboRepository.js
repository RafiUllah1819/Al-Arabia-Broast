import { query } from "../lib/db";

export async function getComboItems(comboId) {
  const result = await query(
    `SELECT ci.id, ci.combo_id, ci.product_id, ci.quantity,
            p.name  AS product_name,
            p.type  AS product_type,
            p.base_price
     FROM   combo_items ci
     JOIN   products p ON p.id = ci.product_id
     WHERE  ci.combo_id = $1
     ORDER  BY p.name ASC`,
    [comboId]
  );
  return result.rows;
}

export async function addComboItem({ combo_id, product_id, quantity }) {
  const result = await query(
    `INSERT INTO combo_items (combo_id, product_id, quantity)
     VALUES ($1, $2, $3)
     RETURNING id, combo_id, product_id, quantity`,
    [combo_id, product_id, parseInt(quantity) || 1]
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

// Check if a product is already in the combo
export async function isProductInCombo(comboId, productId) {
  const result = await query(
    `SELECT id FROM combo_items WHERE combo_id = $1 AND product_id = $2 LIMIT 1`,
    [comboId, productId]
  );
  return result.rows.length > 0;
}
