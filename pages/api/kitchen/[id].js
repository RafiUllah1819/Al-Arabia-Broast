import { requireAuth } from "../../../lib/apiAuth";
import { completeOrder } from "../../../repositories/orderRepository";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "kitchen"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid order ID" });

  try {
    const updated = await completeOrder(id);
    return res.status(200).json({ order: updated });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
