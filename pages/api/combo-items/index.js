import { requireAuth } from "../../../lib/apiAuth";
import { listComboItems, addItemToCombo } from "../../../services/comboService";

export default async function handler(req, res) {
  const minRole = req.method === "POST" ? ["admin"] : ["admin", "manager"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  // GET /api/combo-items?combo_id=X
  if (req.method === "GET") {
    const { combo_id } = req.query;
    if (!combo_id) return res.status(400).json({ error: "combo_id is required" });
    try {
      const items = await listComboItems(parseInt(combo_id));
      return res.status(200).json({ items });
    } catch {
      return res.status(500).json({ error: "Failed to load combo items" });
    }
  }

  if (req.method === "POST") {
    try {
      const { combo_id, product_id, variant_id, combo_only_item_id, quantity } = req.body;
      const item = await addItemToCombo({ combo_id, product_id, variant_id, combo_only_item_id, quantity });
      return res.status(201).json({ item });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
