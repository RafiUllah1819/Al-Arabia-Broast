import { requireAuth } from "../../../lib/apiAuth";
import { addItemsToOrder } from "../../../services/orderService";

/**
 * POST /api/pos/add-items
 * Body: { orderId: number, items: [...] }
 *
 * Appends new items to an existing open dine-in order,
 * updates totals, and resets status to 'pending' so the kitchen
 * sees the updated order.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier", "waiter"]);
  if (!user) return;

  const { orderId, items } = req.body;

  if (!orderId) return res.status(400).json({ error: "orderId required." });
  if (!items || items.length === 0) return res.status(400).json({ error: "Items required." });

  try {
    const result = await addItemsToOrder({ orderId, items });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
