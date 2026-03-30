import { requireAuth } from "../../../lib/apiAuth";
import { listAddonItems, createAddonItem } from "../../../services/addonService";

export default async function handler(req, res) {
  const minRole = req.method === "POST" ? ["admin"] : ["admin", "manager"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  // GET /api/addon-items?group_id=X
  if (req.method === "GET") {
    const { group_id } = req.query;
    if (!group_id) return res.status(400).json({ error: "group_id is required" });
    try {
      const items = await listAddonItems(parseInt(group_id));
      return res.status(200).json({ items });
    } catch {
      return res.status(500).json({ error: "Failed to load addon items" });
    }
  }

  if (req.method === "POST") {
    try {
      const item = await createAddonItem(req.body);
      return res.status(201).json({ item });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
