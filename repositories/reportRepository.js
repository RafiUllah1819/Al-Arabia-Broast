import { query } from "../lib/db";

// ── Dashboard queries ─────────────────────────────────────────────────────────

/**
 * Today's key stats in two queries.
 * Returns: { total_orders, paid_orders, today_revenue, avg_order_value, kitchen_pending }
 */
export async function getDashboardStats() {
  const [salesRes, kitchenRes] = await Promise.all([
    query(
      `SELECT
         COUNT(DISTINCT o.id)                                               AS total_orders,
         COUNT(DISTINCT p.order_id)                                         AS paid_orders,
         COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0)   AS today_revenue,
         COALESCE(
           SUM(CASE WHEN p.status = 'paid' THEN p.amount END)
             / NULLIF(COUNT(DISTINCT CASE WHEN p.status = 'paid' THEN o.id END), 0),
           0
         )                                                                   AS avg_order_value
       FROM   orders  o
       LEFT   JOIN payments p ON p.order_id = o.id
       WHERE  DATE(o.created_at) = CURRENT_DATE`
    ),
    query(
      `SELECT COUNT(*) AS kitchen_pending
       FROM   orders
       WHERE  status IN ('pending', 'preparing')`
    ),
  ]);

  return {
    ...salesRes.rows[0],
    kitchen_pending: parseInt(kitchenRes.rows[0].kitchen_pending),
  };
}

/**
 * Revenue and order count grouped by hour for today (0-23).
 * Only returns hours that have orders — the UI fills the gaps.
 */
export async function getTodayHourly() {
  const res = await query(
    `SELECT
       EXTRACT(HOUR FROM o.created_at)::INTEGER AS hour,
       COUNT(DISTINCT o.id)                     AS order_count,
       COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0) AS revenue
     FROM   orders  o
     LEFT   JOIN payments p ON p.order_id = o.id
     WHERE  DATE(o.created_at) = CURRENT_DATE
     GROUP  BY hour
     ORDER  BY hour ASC`
  );
  return res.rows;
}

/**
 * Last N orders with payment info — for the dashboard recent-orders table.
 */
export async function getRecentOrders(limit = 10) {
  const res = await query(
    `SELECT
       o.id, o.order_number, o.type, o.status, o.total, o.created_at,
       u.name  AS cashier_name,
       p.method AS payment_method,
       p.status AS payment_status
     FROM   orders  o
     LEFT   JOIN users    u ON u.id      = o.created_by
     LEFT   JOIN payments p ON p.order_id = o.id
     ORDER  BY o.created_at DESC
     LIMIT  $1`,
    [limit]
  );
  return res.rows;
}

// ── Report queries ────────────────────────────────────────────────────────────

/**
 * Daily sales breakdown within a date range.
 * Returns one row per day that had paid orders.
 */
export async function getDailySalesReport(from, to) {
  const res = await query(
    `SELECT
       TO_CHAR(DATE(o.created_at), 'YYYY-MM-DD') AS date,
       COUNT(DISTINCT o.id)              AS order_count,
       SUM(p.amount)                     AS revenue,
       AVG(p.amount)                     AS avg_order_value,
       SUM(o.subtotal)                   AS subtotal_sum,
       SUM(o.tax)                        AS tax_sum
     FROM   orders  o
     JOIN   payments p ON p.order_id = o.id AND p.status = 'paid'
     WHERE  DATE(o.created_at) BETWEEN $1 AND $2
     GROUP  BY DATE(o.created_at)
     ORDER  BY date DESC`,
    [from, to]
  );
  return res.rows;
}

/**
 * Top-selling products by quantity and revenue within a date range.
 * Uses order_item snapshots so menu changes don't affect history.
 */
export async function getTopProductsReport(from, to) {
  const res = await query(
    `SELECT
       oi.product_name,
       SUM(oi.quantity)    AS total_qty,
       SUM(oi.line_total)  AS total_revenue
     FROM   order_items oi
     JOIN   orders   o ON o.id    = oi.order_id
     JOIN   payments p ON p.order_id = o.id AND p.status = 'paid'
     WHERE  DATE(o.created_at) BETWEEN $1 AND $2
     GROUP  BY oi.product_name
     ORDER  BY total_qty DESC
     LIMIT  25`,
    [from, to]
  );
  return res.rows;
}

/**
 * Payment totals split by method (cash / card) within a date range.
 */
export async function getPaymentSummaryReport(from, to) {
  const res = await query(
    `SELECT
       p.method,
       COUNT(*)       AS transaction_count,
       SUM(p.amount)  AS total_amount,
       AVG(p.amount)  AS avg_amount
     FROM   payments p
     JOIN   orders   o ON o.id = p.order_id
     WHERE  p.status = 'paid'
       AND  DATE(o.created_at) BETWEEN $1 AND $2
     GROUP  BY p.method
     ORDER  BY total_amount DESC`,
    [from, to]
  );
  return res.rows;
}

/**
 * Per-cashier sales summary within a date range.
 */
export async function getCashierSalesReport(from, to) {
  const res = await query(
    `SELECT
       u.name            AS cashier_name,
       COUNT(DISTINCT o.id)  AS order_count,
       SUM(p.amount)         AS total_revenue,
       AVG(p.amount)         AS avg_order_value
     FROM   orders   o
     JOIN   users    u ON u.id       = o.created_by
     JOIN   payments p ON p.order_id = o.id AND p.status = 'paid'
     WHERE  DATE(o.created_at) BETWEEN $1 AND $2
     GROUP  BY u.id, u.name
     ORDER  BY total_revenue DESC`,
    [from, to]
  );
  return res.rows;
}
