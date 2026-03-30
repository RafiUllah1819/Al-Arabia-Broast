import { requireAuth } from "../../../lib/apiAuth";
import { placeOrder } from "../../../services/orderService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier", "waiter"]);
  if (!user) return;

  const {
    orderType,
    paymentMethod,
    cashTendered,
    cardReference,
    notes,
    tableNumber,
    tableId,
    waiterId,
    customerName,
    customerPhone,
    customerAddress,
    items,
  } = req.body;

  try {
    const result = await placeOrder({
      orderType,
      paymentMethod,
      cashTendered,
      cardReference,
      notes,
      tableNumber,
      tableId,
      waiterId,
      customerName,
      customerPhone,
      customerAddress,
      userId: user.id,
      items,
    });
    return res.status(201).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
