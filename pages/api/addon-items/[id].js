import { requireAuth } from "../../../lib/apiAuth";
import {
  updateAddonItem,
  toggleAddonItemAvailable,
  deleteAddonItem,
} from "../../../services/addonService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  if (req.method === "PUT") {
    if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    try {
      const item = await updateAddonItem(id, req.body);
      return res.status(200).json({ item });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  // PATCH — availability (admin + manager)
  if (req.method === "PATCH") {
    try {
      const item = await toggleAddonItemAvailable(id, req.body.is_available);
      return res.status(200).json({ item });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  if (req.method === "DELETE") {
    if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    try {
      await deleteAddonItem(id);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
