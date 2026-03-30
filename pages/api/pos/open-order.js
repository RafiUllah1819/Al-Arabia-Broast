import { requireAuth } from "../../../lib/apiAuth";
import { getOpenOrderByTable } from "../../../repositories/orderRepository";

/**
 * GET /api/pos/open-order?tableId=X
 *
 * Returns the most recent open (unpaid, not cancelled) dine-in order
 * for the given table, or { order: null } if none exists.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier", "waiter"]);
  if (!user) return;

  const tableId = parseInt(req.query.tableId);
  if (!tableId) return res.status(400).json({ error: "tableId required." });

  try {
    const order = await getOpenOrderByTable(tableId);
    return res.status(200).json({ order: order || null });
  } catch (err) {
    console.error("open-order error:", err);
    return res.status(500).json({ error: "Failed to check open order." });
  }
}
