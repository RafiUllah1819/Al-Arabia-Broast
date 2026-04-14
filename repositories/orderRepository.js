import { query, withTransaction } from "../lib/db";

/**
 * Generate the next order number inside a transaction.
 * Reads the current MAX and increments it.
 * The UNIQUE constraint on orders.order_number is the final safety net.
 */
export async function generateOrderNumber(client) {
  const res = await client.query(
    `SELECT COALESCE(
       MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0
     ) + 1 AS next
     FROM orders`
  );
  const num = res.rows[0].next;
  return `ORD-${String(num).padStart(4, "0")}`;
}

export async function createOrder(client, {
  orderNumber,
  type,
  status = "pending",
  subtotal,
  tax,
  total,
  notes,
  tableNumber,
  tableId,
  waiterId,
  customerName,
  customerPhone,
  customerAddress,
  createdBy,
}) {
  const res = await client.query(
    `INSERT INTO orders
       (order_number, type, status, subtotal, tax, total, notes,
        table_number, table_id, waiter_id,
        customer_name, customer_phone, customer_address, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      orderNumber, type, status, subtotal, tax, total, notes || null,
      tableNumber || null, tableId || null, waiterId || null,
      customerName || null, customerPhone || null, customerAddress || null, createdBy,
    ]
  );
  return res.rows[0];
}

export async function createOrderItem(client, {
  orderId,
  productId,
  variantId,
  productName,
  variantName,
  unitPrice,
  quantity,
  lineTotal,
  isKitchenItem = true,
  notes,
}) {
  const res = await client.query(
    `INSERT INTO order_items
       (order_id, product_id, product_variant_id, product_name, variant_name,
        unit_price, quantity, line_total, is_kitchen_item, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      orderId,
      productId      || null,
      variantId      || null,
      productName,
      variantName    || null,
      unitPrice,
      quantity,
      lineTotal,
      isKitchenItem !== false,
      notes          || null,
    ]
  );
  return res.rows[0];
}

export async function createOrderItemAddon(client, {
  orderItemId,
  addonItemId,
  addonName,
  price,
}) {
  await client.query(
    `INSERT INTO order_item_addons (order_item_id, addon_item_id, addon_name, price)
     VALUES ($1, $2, $3, $4)`,
    [orderItemId, addonItemId || null, addonName, price]
  );
}

export async function createPayment(client, {
  orderId,
  method,
  amount,
  changeDue,
  reference,
  paidBy,
}) {
  const res = await client.query(
    `INSERT INTO payments (order_id, method, amount, change_due, reference, paid_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [orderId, method, amount, changeDue || 0, reference || null, paidBy]
  );
  return res.rows[0];
}

// ── Read queries ──────────────────────────────────────────────────────────────

/**
 * List orders with optional filters.
 *
 * filters: { ownUserId, dateFilter, paymentStatus, orderType }
 *   ownUserId    – when set, restricts to orders created_by that user (cashier view)
 *   dateFilter   – "today" restricts to today's date; anything else = all time
 *   paymentStatus – "paid" | "refunded" | "" (all)
 *   orderType    – "dine-in" | "takeaway" | "" (all)
 */
export async function listOrders({ ownUserId, dateFilter, paymentStatus, orderType } = {}) {
  const conditions = [];
  const params     = [];

  if (ownUserId) {
    params.push(ownUserId);
    conditions.push(`o.created_by = $${params.length}`);
  }

  if (dateFilter === "today") {
    conditions.push(`DATE(o.created_at) = CURRENT_DATE`);
  }

  if (paymentStatus === "unpaid") {
    conditions.push(`p.status IS NULL`);
  } else if (paymentStatus) {
    params.push(paymentStatus);
    conditions.push(`p.status = $${params.length}`);
  }

  if (orderType) {
    params.push(orderType);
    conditions.push(`o.type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query(
    `SELECT
       o.id,
       o.order_number,
       o.type,
       o.status,
       o.subtotal,
       o.tax,
       o.total,
       o.table_number,
       o.table_id,
       o.waiter_id,
       o.customer_name,
       o.customer_phone,
       o.customer_address,
       o.notes,
       o.created_at,
       u.name           AS cashier_name,
       w.name           AS waiter_name,
       t.name           AS table_name,
       p.method         AS payment_method,
       p.status         AS payment_status,
       p.amount         AS payment_amount,
       p.change_due,
       COUNT(oi.id)     AS item_count
     FROM   orders o
     LEFT   JOIN users       u  ON u.id       = o.created_by
     LEFT   JOIN users       w  ON w.id       = o.waiter_id
     LEFT   JOIN tables      t  ON t.id       = o.table_id
     LEFT   JOIN payments    p  ON p.order_id = o.id
     LEFT   JOIN order_items oi ON oi.order_id = o.id
     ${where}
     GROUP  BY o.id, u.name, w.name, t.name, p.method, p.status, p.amount, p.change_due
     ORDER  BY o.created_at DESC`,
    params
  );
  return res.rows;
}

/**
 * Full order detail: header + items + per-item addons + payment.
 * Pass ownUserId to enforce cashier-can-only-see-own-orders rule.
 */
export async function getOrderWithDetails(id, { ownUserId } = {}) {
  // 1. Order header + payment
  const orderParams = [id];
  let ownerClause   = "";
  if (ownUserId) {
    orderParams.push(ownUserId);
    ownerClause = `AND o.created_by = $2`;
  }

  const orderRes = await query(
    `SELECT
       o.*,
       u.name  AS cashier_name,
       w.name  AS waiter_name,
       t.name  AS table_name,
       p.method        AS payment_method,
       p.status        AS payment_status,
       p.amount        AS payment_amount,
       p.change_due,
       p.reference     AS payment_reference,
       p.paid_at
     FROM   orders o
     LEFT   JOIN users    u ON u.id       = o.created_by
     LEFT   JOIN users    w ON w.id       = o.waiter_id
     LEFT   JOIN tables   t ON t.id       = o.table_id
     LEFT   JOIN payments p ON p.order_id = o.id
     WHERE  o.id = $1 ${ownerClause}`,
    orderParams
  );

  const order = orderRes.rows[0];
  if (!order) return null;

  // 2. Order items — include product_id and product type for combo detection
  const itemsRes = await query(
    `SELECT oi.id, oi.product_id, oi.product_name, oi.variant_name,
            oi.unit_price, oi.quantity, oi.line_total, oi.notes,
            p.type AS product_type
     FROM   order_items oi
     LEFT   JOIN products p ON p.id = oi.product_id
     WHERE  oi.order_id = $1
     ORDER  BY oi.id ASC`,
    [id]
  );
  const items   = itemsRes.rows;
  const itemIds = items.map((i) => i.id);

  // 3. Addons for those items
  let addonsByItem = {};
  if (itemIds.length > 0) {
    const addonsRes = await query(
      `SELECT order_item_id, addon_name, price
       FROM   order_item_addons
       WHERE  order_item_id = ANY($1)
       ORDER  BY id ASC`,
      [itemIds]
    );
    for (const a of addonsRes.rows) {
      if (!addonsByItem[a.order_item_id]) addonsByItem[a.order_item_id] = [];
      addonsByItem[a.order_item_id].push({ name: a.addon_name, price: parseFloat(a.price) });
    }
  }

  // 4. Fetch combo contents for any combo-type items
  const comboProductIds = [...new Set(
    items.filter((i) => i.product_type === "combo" && i.product_id).map((i) => i.product_id)
  )];

  let comboContentsByProductId = {};
  if (comboProductIds.length > 0) {
    const comboRes = await query(
      `SELECT
         ci.combo_id,
         ci.quantity,
         p.name   AS product_name,
         pv.name  AS variant_name,
         coi.name AS combo_only_item_name
       FROM   combo_items ci
       LEFT JOIN products          p   ON p.id   = ci.product_id
       LEFT JOIN product_variants  pv  ON pv.id  = ci.variant_id
       LEFT JOIN combo_only_items  coi ON coi.id = ci.combo_only_item_id
       WHERE  ci.combo_id = ANY($1)
       ORDER  BY ci.combo_id, ci.id ASC`,
      [comboProductIds]
    );
    for (const row of comboRes.rows) {
      if (!comboContentsByProductId[row.combo_id]) comboContentsByProductId[row.combo_id] = [];
      const label = row.combo_only_item_name
        || (row.variant_name ? `${row.product_name} — ${row.variant_name}` : row.product_name);
      comboContentsByProductId[row.combo_id].push({ name: label, quantity: row.quantity });
    }
  }

  // 5. Attach addons and combo contents to items
  const enrichedItems = items.map((item) => ({
    ...item,
    unit_price:     parseFloat(item.unit_price),
    line_total:     parseFloat(item.line_total),
    addons:         addonsByItem[item.id] || [],
    combo_contents: item.product_type === "combo"
      ? (comboContentsByProductId[item.product_id] || [])
      : [],
  }));

  return { ...order, items: enrichedItems };
}

// ── Kitchen queries ────────────────────────────────────────────────────────────

/**
 * Fetch all active orders for the kitchen board:
 * status IN ('pending', 'preparing', 'ready') ordered oldest-first (FIFO).
 * Uses 3 flat queries to avoid N+1.
 */
export async function getKitchenOrders() {
  // 1. Active order headers (include waiter name via LEFT JOIN)
  const ordersRes = await query(
    `SELECT o.id, o.order_number, o.type, o.status, o.notes,
            o.table_number, o.customer_name, o.created_at,
            u.name AS waiter_name
     FROM   orders o
     LEFT   JOIN users u ON u.id = o.waiter_id
     WHERE  o.status IN ('pending', 'preparing', 'ready')
     ORDER  BY o.created_at ASC`
  );
  const orders   = ordersRes.rows;
  const orderIds = orders.map((o) => o.id);

  if (orderIds.length === 0) return [];

  // 2. Items for all those orders — only kitchen items, include product_id and type for combo detection
  const itemsRes = await query(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.variant_name,
            oi.quantity, oi.notes,
            p.type AS product_type
     FROM   order_items oi
     LEFT   JOIN products p ON p.id = oi.product_id
     WHERE  oi.order_id = ANY($1)
       AND  oi.is_kitchen_item = TRUE
     ORDER  BY oi.order_id ASC, oi.id ASC`,
    [orderIds]
  );
  const allItems   = itemsRes.rows;
  const itemIds    = allItems.map((i) => i.id);

  // 3. Addons for all those items
  let addonsByItem = {};
  if (itemIds.length > 0) {
    const addonsRes = await query(
      `SELECT order_item_id, addon_name
       FROM   order_item_addons
       WHERE  order_item_id = ANY($1)
       ORDER  BY id ASC`,
      [itemIds]
    );
    for (const a of addonsRes.rows) {
      if (!addonsByItem[a.order_item_id]) addonsByItem[a.order_item_id] = [];
      addonsByItem[a.order_item_id].push(a.addon_name);
    }
  }

  // 4. Fetch combo contents for combo-type items
  const comboProductIds = [...new Set(
    allItems.filter((i) => i.product_type === "combo" && i.product_id).map((i) => i.product_id)
  )];

  let comboContentsByProductId = {};
  if (comboProductIds.length > 0) {
    const comboRes = await query(
      `SELECT
         ci.combo_id,
         ci.quantity,
         p.name   AS product_name,
         pv.name  AS variant_name,
         coi.name AS combo_only_item_name
       FROM   combo_items ci
       LEFT JOIN products          p   ON p.id   = ci.product_id
       LEFT JOIN product_variants  pv  ON pv.id  = ci.variant_id
       LEFT JOIN combo_only_items  coi ON coi.id = ci.combo_only_item_id
       WHERE  ci.combo_id = ANY($1)
         AND  (ci.combo_only_item_id IS NOT NULL OR p.is_kitchen_item = TRUE)
       ORDER  BY ci.combo_id, ci.id ASC`,
      [comboProductIds]
    );
    for (const row of comboRes.rows) {
      if (!comboContentsByProductId[row.combo_id]) comboContentsByProductId[row.combo_id] = [];
      const label = row.combo_only_item_name
        || (row.variant_name ? `${row.product_name} — ${row.variant_name}` : row.product_name);
      comboContentsByProductId[row.combo_id].push({ name: label, quantity: row.quantity });
    }
  }

  // 5. Group items by order_id, attach addons and combo contents
  const itemsByOrder = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push({
      id:             item.id,
      product_name:   item.product_name,
      variant_name:   item.variant_name || null,
      quantity:       item.quantity,
      notes:          item.notes || null,
      addons:         addonsByItem[item.id] || [],
      combo_contents: item.product_type === "combo"
        ? (comboContentsByProductId[item.product_id] || [])
        : [],
    });
  }

  return orders.map((o) => ({
    ...o,
    items: itemsByOrder[o.id] || [],
  }));
}

/**
 * Advance an order's kitchen status.
 * Only allows forward transitions:
 *   pending → preparing → ready → completed
 */
const VALID_TRANSITIONS = {
  pending:   "preparing",
  preparing: "ready",
  ready:     "completed",
};

export async function advanceOrderStatus(id) {
  // Read current status
  const cur = await query(`SELECT status FROM orders WHERE id = $1`, [id]);
  if (!cur.rows[0]) {
    const e = new Error("Order not found.");
    e.status = 404;
    throw e;
  }

  const current = cur.rows[0].status;
  const next    = VALID_TRANSITIONS[current];
  if (!next) {
    const e = new Error(`Cannot advance order from status "${current}".`);
    e.status = 400;
    throw e;
  }

  const res = await query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
    [next, id]
  );
  return res.rows[0];
}

// ── Open-bill queries ─────────────────────────────────────────────────────────

/**
 * Find the most recent open (unpaid, not cancelled) dine-in order for a table.
 * Used by POS to detect whether a table already has a running bill.
 */
export async function getOpenOrderByTable(tableId) {
  const res = await query(
    `SELECT o.id, o.order_number, o.subtotal, o.total, o.status, o.table_id, o.table_number
     FROM   orders  o
     LEFT   JOIN payments p ON p.order_id = o.id
     WHERE  o.type     = 'dine-in'
       AND  o.table_id = $1
       AND  p.id       IS NULL
       AND  o.status  != 'cancelled'
     ORDER  BY o.created_at DESC
     LIMIT  1`,
    [tableId]
  );
  return res.rows[0] || null;
}

/**
 * Add the cost of newly appended items to an order's subtotal/total.
 * Only resets status to 'pending' if resetKitchenStatus is true
 * (i.e. at least one of the new items is a kitchen item).
 * Must be called inside a transaction (client param).
 */
export async function updateOrderTotals(client, { orderId, addSubtotal, resetKitchenStatus = true }) {
  const res = await client.query(
    resetKitchenStatus
      ? `UPDATE orders
         SET subtotal   = subtotal + $1,
             total      = total    + $1,
             status     = 'pending',
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, order_number, subtotal, total, status`
      : `UPDATE orders
         SET subtotal   = subtotal + $1,
             total      = total    + $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, order_number, subtotal, total, status`,
    [addSubtotal, orderId]
  );
  return res.rows[0];
}

/**
 * Cancel an order.
 * Allowed from any status except 'completed' or already 'cancelled'.
 * If the order has a dine-in table, frees it back to 'available'.
 */
export async function cancelOrder(id) {
  const cur = await query(
    `SELECT o.status, o.table_id
     FROM orders o
     WHERE o.id = $1`,
    [id]
  );
  if (!cur.rows[0]) {
    const e = new Error("Order not found.");
    e.status = 404;
    throw e;
  }
  const { status, table_id } = cur.rows[0];
  if (status === "cancelled") {
    const e = new Error("Order is already cancelled.");
    e.status = 400;
    throw e;
  }
  if (status === "completed") {
    const e = new Error("Cannot cancel a completed order.");
    e.status = 400;
    throw e;
  }

  // Use a transaction so the order update and table release are atomic
  return withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id, status`,
      [id]
    );
    if (table_id) {
      await client.query(
        `UPDATE tables SET status = 'available' WHERE id = $1`,
        [table_id]
      );
    }
    return res.rows[0];
  });
}

/**
 * Directly mark an order as completed from the kitchen.
 * Works from any active status (pending / preparing / ready).
 */
export async function completeOrder(id) {
  const cur = await query(`SELECT status FROM orders WHERE id = $1`, [id]);
  if (!cur.rows[0]) {
    const e = new Error("Order not found.");
    e.status = 404;
    throw e;
  }
  const current = cur.rows[0].status;
  if (current === "completed") {
    const e = new Error("Order is already completed.");
    e.status = 400;
    throw e;
  }
  if (current === "cancelled") {
    const e = new Error("Cannot complete a cancelled order.");
    e.status = 400;
    throw e;
  }
  const res = await query(
    `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING id, status`,
    [id]
  );
  return res.rows[0];
}
