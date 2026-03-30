import { requireAuth } from "../../../lib/apiAuth";
import { updateAddonGroup, toggleAddonGroupActive } from "../../../services/addonService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  if (req.method === "PUT") {
    try {
      const group = await updateAddonGroup(id, req.body);
      return res.status(200).json({ group });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    try {
      const group = await toggleAddonGroupActive(id, req.body.is_active);
      return res.status(200).json({ group });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
