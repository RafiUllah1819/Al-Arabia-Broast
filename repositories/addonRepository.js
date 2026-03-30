import { query } from "../lib/db";

// ── Addon Groups ──────────────────────────────────────────────────────────────

export async function getAllAddonGroups() {
  const result = await query(
    `SELECT id, name, min_select, max_select, is_active
     FROM   addon_groups
     ORDER  BY name ASC`
  );
  return result.rows;
}

export async function createAddonGroup({ name, min_select, max_select }) {
  const result = await query(
    `INSERT INTO addon_groups (name, min_select, max_select)
     VALUES ($1, $2, $3)
     RETURNING id, name, min_select, max_select, is_active`,
    [name, parseInt(min_select) || 0, parseInt(max_select) || 1]
  );
  return result.rows[0];
}

export async function updateAddonGroup(id, { name, min_select, max_select }) {
  const result = await query(
    `UPDATE addon_groups
     SET name = $1, min_select = $2, max_select = $3
     WHERE id = $4
     RETURNING id, name, min_select, max_select, is_active`,
    [name, parseInt(min_select) || 0, parseInt(max_select) || 1, id]
  );
  return result.rows[0];
}

export async function setAddonGroupActive(id, isActive) {
  const result = await query(
    `UPDATE addon_groups SET is_active = $1 WHERE id = $2
     RETURNING id, is_active`,
    [isActive, id]
  );
  return result.rows[0];
}

// ── Addon Items ───────────────────────────────────────────────────────────────

export async function getItemsByGroup(groupId) {
  const result = await query(
    `SELECT id, addon_group_id, name, price, is_available, sort_order
     FROM   addon_items
     WHERE  addon_group_id = $1
     ORDER  BY sort_order ASC, name ASC`,
    [groupId]
  );
  return result.rows;
}

export async function createAddonItem({ addon_group_id, name, price, sort_order }) {
  const result = await query(
    `INSERT INTO addon_items (addon_group_id, name, price, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id, addon_group_id, name, price, is_available, sort_order`,
    [addon_group_id, name, parseFloat(price) || 0, parseInt(sort_order) || 0]
  );
  return result.rows[0];
}

export async function updateAddonItem(id, { name, price, sort_order }) {
  const result = await query(
    `UPDATE addon_items
     SET name = $1, price = $2, sort_order = $3
     WHERE id = $4
     RETURNING id, addon_group_id, name, price, is_available, sort_order`,
    [name, parseFloat(price) || 0, parseInt(sort_order) || 0, id]
  );
  return result.rows[0];
}

export async function setAddonItemAvailable(id, isAvailable) {
  const result = await query(
    `UPDATE addon_items SET is_available = $1 WHERE id = $2
     RETURNING id, is_available`,
    [isAvailable, id]
  );
  return result.rows[0];
}

export async function deleteAddonItem(id) {
  await query("DELETE FROM addon_items WHERE id = $1", [id]);
}

// ── Product ↔ Addon Group linking ─────────────────────────────────────────────

export async function getGroupsForProduct(productId) {
  const result = await query(
    `SELECT g.id, g.name, g.min_select, g.max_select, g.is_active
     FROM   addon_groups g
     JOIN   product_addon_groups pag ON pag.addon_group_id = g.id
     WHERE  pag.product_id = $1
     ORDER  BY g.name ASC`,
    [productId]
  );
  return result.rows;
}

export async function linkGroupToProduct(productId, groupId) {
  await query(
    `INSERT INTO product_addon_groups (product_id, addon_group_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [productId, groupId]
  );
}

export async function unlinkGroupFromProduct(productId, groupId) {
  await query(
    `DELETE FROM product_addon_groups
     WHERE product_id = $1 AND addon_group_id = $2`,
    [productId, groupId]
  );
}
