import { query } from "../lib/db";

export async function getAllComboOnlyItems() {
  const result = await query(
    `SELECT id, name, sort_order
     FROM   combo_only_items
     ORDER  BY sort_order ASC, name ASC`
  );
  return result.rows;
}

export async function createComboOnlyItem({ name, sort_order }) {
  const result = await query(
    `INSERT INTO combo_only_items (name, sort_order)
     VALUES ($1, $2)
     RETURNING id, name, sort_order`,
    [name.trim(), parseInt(sort_order) || 0]
  );
  return result.rows[0];
}

export async function updateComboOnlyItem(id, { name, sort_order }) {
  const result = await query(
    `UPDATE combo_only_items SET name = $1, sort_order = $2
     WHERE id = $3
     RETURNING id, name, sort_order`,
    [name.trim(), parseInt(sort_order) || 0, id]
  );
  return result.rows[0];
}

export async function deleteComboOnlyItem(id) {
  await query("DELETE FROM combo_only_items WHERE id = $1", [id]);
}
