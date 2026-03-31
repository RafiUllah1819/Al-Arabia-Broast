import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

/**
 * GET /api/pos/tables-with-bills
 *
 * Returns all active tables enriched with their current open dine-in bill
 * (if one exists) in a single query — used by the POS table picker grid.
 *
 * Each row shape:
 *   id, name, capacity, status,
 *   order_id, order_number, bill_total, order_status, waiter_name
 * order_id is null when no open bill exists for that table.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier", "waiter"]);
  if (!user) return;

  try {
    const result = await query(
      `SELECT
         t.id,
         t.name,
         t.capacity,
         t.status,
         o.id           AS order_id,
         o.order_number,
         o.total        AS bill_total,
         o.status       AS order_status,
         o.created_at   AS order_opened_at,
         u.name         AS waiter_name
       FROM tables t
       LEFT JOIN orders o ON (
         o.id = (
           SELECT o2.id
           FROM   orders   o2
           LEFT   JOIN payments p ON p.order_id = o2.id
           WHERE  o2.table_id  = t.id
             AND  o2.type      = 'dine-in'
             AND  o2.status   != 'cancelled'
             AND  p.id         IS NULL
           ORDER  BY o2.created_at DESC
           LIMIT  1
         )
       )
       LEFT JOIN users u ON u.id = o.waiter_id
       WHERE t.is_active = TRUE
       ORDER BY t.name ASC`
    );
    return res.status(200).json({ tables: result.rows });
  } catch (err) {
    console.error("tables-with-bills error:", err);
    return res.status(500).json({ error: "Failed to load tables." });
  }
}
