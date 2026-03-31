import { query } from "../lib/db";

export async function getAllProducts({ category_id } = {}) {
  const conditions = [];
  const params     = [];

  if (category_id) {
    params.push(category_id);
    conditions.push(`p.category_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT p.id, p.category_id, p.name, p.slug, p.barcode, p.description,
            p.type, p.base_price, p.image_url, p.is_available, p.is_active,
            p.is_kitchen_item, p.sort_order, p.created_at,
            c.name AS category_name
     FROM   products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY c.sort_order ASC, p.sort_order ASC, p.name ASC`,
    params
  );
  return result.rows;
}

export async function getProductById(id) {
  const result = await query(
    `SELECT p.id, p.category_id, p.name, p.slug, p.barcode, p.description,
            p.type, p.base_price, p.image_url, p.is_available, p.is_active,
            p.is_kitchen_item, p.sort_order, p.created_at,
            c.name AS category_name
     FROM   products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE  p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function isSlugTaken(slug, excludeId = null) {
  const result = excludeId
    ? await query(
        "SELECT id FROM products WHERE slug = $1 AND id != $2 LIMIT 1",
        [slug, excludeId]
      )
    : await query(
        "SELECT id FROM products WHERE slug = $1 LIMIT 1",
        [slug]
      );
  return result.rows.length > 0;
}

export async function createProduct({
  category_id, name, slug, barcode, description, type, base_price,
  image_url, is_available, is_active, is_kitchen_item, sort_order,
}) {
  const result = await query(
    `INSERT INTO products
       (category_id, name, slug, barcode, description, type, base_price,
        image_url, is_available, is_active, is_kitchen_item, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, category_id, name, slug, barcode, description, type, base_price, image_url,
               is_available, is_active, is_kitchen_item, sort_order, created_at`,
    [category_id || null, name, slug, barcode || null, description || null, type,
     base_price || null, image_url, is_available, is_active, is_kitchen_item, sort_order ?? 0]
  );
  return result.rows[0];
}

export async function updateProduct(id, {
  category_id, name, slug, barcode, description, type, base_price,
  image_url, is_available, is_active, is_kitchen_item, sort_order,
}) {
  const result = await query(
    `UPDATE products
     SET category_id = $1, name = $2, slug = $3, barcode = $4, description = $5,
         type = $6, base_price = $7, image_url = $8, is_available = $9, is_active = $10,
         is_kitchen_item = $11, sort_order = $12
     WHERE id = $13
     RETURNING id, category_id, name, slug, barcode, description, type, base_price, image_url,
               is_available, is_active, is_kitchen_item, sort_order`,
    [category_id || null, name, slug, barcode || null, description || null, type,
     base_price || null, image_url, is_available, is_active, is_kitchen_item, sort_order ?? 0, id]
  );
  return result.rows[0];
}

export async function setProductAvailable(id, isAvailable) {
  const result = await query(
    `UPDATE products SET is_available = $1 WHERE id = $2
     RETURNING id, is_available`,
    [isAvailable, id]
  );
  return result.rows[0];
}

export async function setProductActive(id, isActive) {
  const result = await query(
    `UPDATE products SET is_active = $1 WHERE id = $2
     RETURNING id, is_active`,
    [isActive, id]
  );
  return result.rows[0];
}
