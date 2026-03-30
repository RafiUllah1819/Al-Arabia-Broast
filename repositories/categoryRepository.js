import { query } from "../lib/db";

export async function getAllCategories() {
  const result = await query(
    `SELECT id, name, sort_order, is_active
     FROM categories
     ORDER BY sort_order ASC, name ASC`
  );
  return result.rows;
}

export async function getCategoryById(id) {
  const result = await query(
    `SELECT id, name, sort_order, is_active FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function isCategoryNameTaken(name, excludeId = null) {
  const result = excludeId
    ? await query(
        "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2 LIMIT 1",
        [name, excludeId]
      )
    : await query(
        "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [name]
      );
  return result.rows.length > 0;
}

export async function createCategory({ name, sort_order }) {
  const result = await query(
    `INSERT INTO categories (name, sort_order)
     VALUES ($1, $2)
     RETURNING id, name, sort_order, is_active`,
    [name, sort_order]
  );
  return result.rows[0];
}

export async function updateCategory(id, { name, sort_order }) {
  const result = await query(
    `UPDATE categories SET name = $1, sort_order = $2
     WHERE id = $3
     RETURNING id, name, sort_order, is_active`,
    [name, sort_order, id]
  );
  return result.rows[0];
}

export async function setCategoryActive(id, isActive) {
  const result = await query(
    `UPDATE categories SET is_active = $1 WHERE id = $2
     RETURNING id, is_active`,
    [isActive, id]
  );
  return result.rows[0];
}
