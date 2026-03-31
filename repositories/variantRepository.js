import { query } from "../lib/db";

export async function getVariantsByProduct(productId) {
  const result = await query(
    `SELECT id, product_id, name, price, is_available, is_active, sort_order
     FROM   product_variants
     WHERE  product_id = $1
     ORDER  BY name ASC`,
    [productId]
  );
  return result.rows;
}

export async function createVariant({ product_id, name, price, sort_order }) {
  const result = await query(
    `INSERT INTO product_variants (product_id, name, price, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id, product_id, name, price, is_available, is_active, sort_order`,
    [product_id, name, parseFloat(price), parseInt(sort_order) || 0]
  );
  return result.rows[0];
}

export async function updateVariant(id, { name, price, sort_order }) {
  const result = await query(
    `UPDATE product_variants
     SET name = $1, price = $2, sort_order = $3
     WHERE id = $4
     RETURNING id, product_id, name, price, is_available, is_active, sort_order`,
    [name, parseFloat(price), parseInt(sort_order) || 0, id]
  );
  return result.rows[0];
}

export async function setVariantAvailable(id, isAvailable) {
  const result = await query(
    `UPDATE product_variants SET is_available = $1 WHERE id = $2
     RETURNING id, is_available`,
    [isAvailable, id]
  );
  return result.rows[0];
}

export async function setVariantActive(id, isActive) {
  const result = await query(
    `UPDATE product_variants SET is_active = $1 WHERE id = $2
     RETURNING id, is_active`,
    [isActive, id]
  );
  return result.rows[0];
}

export async function deleteVariant(id) {
  await query("DELETE FROM product_variants WHERE id = $1", [id]);
}
