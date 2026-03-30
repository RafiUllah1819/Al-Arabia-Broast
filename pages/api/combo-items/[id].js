import { requireAuth } from "../../../lib/apiAuth";
import { removeItemFromCombo, updateItemQuantity } from "../../../services/comboService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  // PATCH — update quantity
  if (req.method === "PATCH") {
    try {
      const item = await updateItemQuantity(id, req.body.quantity);
      return res.status(200).json({ item });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      await removeItemFromCombo(id);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
