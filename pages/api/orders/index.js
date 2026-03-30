import { requireAuth } from "../../../lib/apiAuth";
import { listOrders } from "../../../repositories/orderRepository";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier"]);
  if (!user) return;

  const { date, payment_status, order_type } = req.query;

  try {
    const orders = await listOrders({
      // Cashiers only see their own orders
      ownUserId:     user.role === "cashier" ? user.id : null,
      dateFilter:    date           || "",
      paymentStatus: payment_status || "",
      orderType:     order_type     || "",
    });
    return res.status(200).json({ orders });
  } catch (err) {
    console.error("List orders error:", err);
    return res.status(500).json({ error: "Failed to load orders" });
  }
}
