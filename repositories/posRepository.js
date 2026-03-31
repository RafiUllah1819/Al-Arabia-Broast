import { query } from "../lib/db";

/**
 * Returns everything the POS needs in one efficient batch:
 *  - Active categories
 *  - Active + available products
 *  - Their variants (active + available)
 *  - Their addon groups and items (active + available)
 *
 * All grouping is done in JS after 4 flat SQL queries to avoid N+1.
 */
export async function getPOSMenu() {
  // 1. Active categories
  const catRows = await query(
    `SELECT id, name, sort_order
     FROM   categories
     WHERE  is_active = TRUE
     ORDER  BY sort_order ASC, name ASC`
  ).catch((err) => { throw Object.assign(err, { _step: "categories" }); });

  // 2. Active + available products
  const prodRows = await query(
    `SELECT p.id, p.category_id, p.name, p.type, p.base_price, p.description, p.image_url,
            p.is_kitchen_item, c.name AS category_name
     FROM   products p
     LEFT   JOIN categories c ON c.id = p.category_id
     WHERE  p.is_active = TRUE AND p.is_available = TRUE
     ORDER  BY c.sort_order ASC NULLS LAST, p.sort_order ASC, p.name ASC`
  ).catch((err) => { throw Object.assign(err, { _step: "products" }); });

  const products   = prodRows.rows;
  const productIds = products.map((p) => p.id);

  if (productIds.length === 0) {
    return { categories: catRows.rows, products: [] };
  }

  // 3. Variants for all those products (active + available)
  const varRows = await query(
    `SELECT id, product_id, name, price, sort_order
     FROM   product_variants
     WHERE  product_id = ANY($1)
       AND  is_active     = TRUE
       AND  is_available  = TRUE
     ORDER  BY name ASC`,
    [productIds]
  ).catch((err) => { throw Object.assign(err, { _step: "variants" }); });

  // 4. Addon groups + items for all those products (active groups, available items)
  const addonRows = await query(
    `SELECT
       pag.product_id,
       g.id   AS group_id,   g.name AS group_name,
       g.min_select,         g.max_select,
       ai.id  AS item_id,    ai.name  AS item_name,
       ai.price AS item_price,         ai.sort_order AS item_sort
     FROM   product_addon_groups pag
     JOIN   addon_groups g  ON g.id  = pag.addon_group_id AND g.is_active    = TRUE
     LEFT   JOIN addon_items  ai ON ai.addon_group_id = g.id AND ai.is_available = TRUE
     WHERE  pag.product_id = ANY($1)
     ORDER  BY g.name ASC, ai.sort_order ASC, ai.name ASC`,
    [productIds]
  ).catch((err) => { throw Object.assign(err, { _step: "addon_groups" }); });

  // ── Group variants by product_id ────────────────────────────────────────────
  const variantsByProduct = {};
  for (const v of varRows.rows) {
    if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
    variantsByProduct[v.product_id].push({
      id:    v.id,
      name:  v.name,
      price: parseFloat(v.price),
    });
  }

  // ── Group addon groups+items by product_id ──────────────────────────────────
  const addonsByProduct = {};
  for (const row of addonRows.rows) {
    const pid = row.product_id;
    if (!addonsByProduct[pid]) addonsByProduct[pid] = {};

    if (!addonsByProduct[pid][row.group_id]) {
      addonsByProduct[pid][row.group_id] = {
        id:          row.group_id,
        name:        row.group_name,
        min_select:  row.min_select,
        max_select:  row.max_select,
        items:       [],
      };
    }
    if (row.item_id) {
      addonsByProduct[pid][row.group_id].items.push({
        id:    row.item_id,
        name:  row.item_name,
        price: parseFloat(row.item_price),
      });
    }
  }

  // 5. Combo contents for combo-type products
  const comboIds = products.filter((p) => p.type === "combo").map((p) => p.id);
  const comboContentsByProduct = {};

  if (comboIds.length > 0) {
    const comboRows = await query(
      `SELECT ci.combo_id, ci.quantity,
              p.name   AS product_name,
              pv.name  AS variant_name,
              coi.name AS combo_only_item_name
       FROM   combo_items ci
       LEFT   JOIN products          p   ON p.id   = ci.product_id
       LEFT   JOIN product_variants  pv  ON pv.id  = ci.variant_id
       LEFT   JOIN combo_only_items  coi ON coi.id = ci.combo_only_item_id
       WHERE  ci.combo_id = ANY($1)
       ORDER  BY ci.combo_id, ci.id ASC`,
      [comboIds]
    ).catch((err) => { throw Object.assign(err, { _step: "combo_contents" }); });

    for (const row of comboRows.rows) {
      if (!comboContentsByProduct[row.combo_id]) comboContentsByProduct[row.combo_id] = [];
      const label = row.combo_only_item_name
        || (row.variant_name ? `${row.product_name} — ${row.variant_name}` : row.product_name);
      comboContentsByProduct[row.combo_id].push({ name: label, quantity: row.quantity });
    }
  }

  // ── Assemble final product objects ──────────────────────────────────────────
  const enriched = products.map((p) => ({
    ...p,
    base_price:      p.base_price != null ? parseFloat(p.base_price) : null,
    variants:        variantsByProduct[p.id]              || [],
    addon_groups:    Object.values(addonsByProduct[p.id] || {}),
    combo_contents:  p.type === "combo" ? (comboContentsByProduct[p.id] || []) : [],
  }));

  return { categories: catRows.rows, products: enriched };
}
