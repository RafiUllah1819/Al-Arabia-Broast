import { requireAuth } from "../../../lib/apiAuth";
import { getOrderWithDetails, cancelOrder } from "../../../repositories/orderRepository";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager", "cashier"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid order ID" });

  // ── GET: fetch order detail ──────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const order = await getOrderWithDetails(id, {
        ownUserId: user.role === "cashier" ? user.id : null,
      });
      if (!order) return res.status(404).json({ error: "Order not found" });
      return res.status(200).json({ order });
    } catch (err) {
      console.error("Get order error:", err);
      return res.status(500).json({ error: "Failed to load order" });
    }
  }

  // ── PATCH: cancel order ──────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const { action } = req.body || {};
    if (action !== "cancel") return res.status(400).json({ error: "Invalid action" });

    // Only admin and manager can cancel orders
    if (user.role === "cashier") return res.status(403).json({ error: "Not authorized to cancel orders" });

    try {
      const updated = await cancelOrder(id);
      return res.status(200).json({ order: updated });
    } catch (err) {
      console.error("Cancel order error:", err);
      return res.status(err.status || 500).json({ error: err.message || "Failed to cancel order" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
