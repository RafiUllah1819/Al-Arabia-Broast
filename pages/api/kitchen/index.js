import { requireAuth } from "../../../lib/apiAuth";
import { getKitchenOrders } from "../../../repositories/orderRepository";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "kitchen"]);
  if (!user) return;

  try {
    const orders = await getKitchenOrders();
    return res.status(200).json({ orders });
  } catch (err) {
    console.error("Kitchen orders error:", err);
    return res.status(500).json({ error: "Failed to load kitchen orders" });
  }
}
