import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

/**
 * DELETE /api/admin/clear-data
 * Wipes all orders, order items, and payments from the database.
 * Also resets restaurant table statuses to "available".
 * Admin-only. Intended for testing / fresh-start use.
 */
export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  try {
    // Reset all table statuses so no table stays "occupied" after orders are gone
    await query(`UPDATE tables SET status = 'available'`);

    // Delete all orders — cascades automatically to:
    //   order_items, order_item_addons, payments
    // RESTART IDENTITY resets auto-increment counters for those tables only
    await query(`TRUNCATE TABLE orders RESTART IDENTITY CASCADE`);

    return res.status(200).json({ message: "All order and payment data cleared." });
  } catch (err) {
    console.error("Clear data error:", err);
    return res.status(500).json({ error: "Failed to clear data." });
  }
}
