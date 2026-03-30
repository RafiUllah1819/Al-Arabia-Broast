import { requireAuth } from "../../../lib/apiAuth";
import { query, withTransaction } from "../../../lib/db";
import { createPayment } from "../../../repositories/orderRepository";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier"]);
  if (!user) return;

  const { orderId, paymentMethod, cashTendered, cardReference } = req.body;

  if (!orderId) return res.status(400).json({ error: "Order ID required." });
  if (!["cash", "card"].includes(paymentMethod))
    return res.status(400).json({ error: "Invalid payment method." });

  try {
    // Load the order
    const orderRes = await query("SELECT * FROM orders WHERE id = $1", [orderId]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: "Order not found." });

    // Prevent double-payment
    const existing = await query("SELECT id FROM payments WHERE order_id = $1", [orderId]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "This order already has a payment recorded." });

    const total = parseFloat(order.total);

    if (paymentMethod === "cash") {
      const tendered = parseFloat(cashTendered);
      if (isNaN(tendered) || tendered < total)
        return res.status(400).json({ error: `Cash received must be at least Rs. ${total.toFixed(2)}.` });
    }

    const changeDue = paymentMethod === "cash"
      ? Math.round((parseFloat(cashTendered) - total) * 100) / 100
      : 0;

    const payment = await withTransaction(async (client) => {
      return createPayment(client, {
        orderId:   order.id,
        method:    paymentMethod,
        amount:    total,
        changeDue,
        reference: cardReference || null,
        paidBy:    user.id,
      });
    });

    return res.status(200).json({ payment, changeDue });
  } catch (err) {
    console.error("Collect payment error:", err);
    return res.status(500).json({ error: "Failed to collect payment." });
  }
}
