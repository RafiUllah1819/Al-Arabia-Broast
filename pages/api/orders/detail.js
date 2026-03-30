import { requireAuth } from "../../../lib/apiAuth";
import { getOrderWithDetails } from "../../../repositories/orderRepository";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid order ID" });

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
