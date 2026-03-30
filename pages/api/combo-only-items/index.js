import { requireAuth } from "../../../lib/apiAuth";
import { listComboOnlyItems, createComboOnlyItem } from "../../../services/comboOnlyItemService";

export default async function handler(req, res) {
  const minRole = req.method === "GET" ? ["admin", "manager"] : ["admin"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const items = await listComboOnlyItems();
      return res.status(200).json({ items });
    } catch {
      return res.status(500).json({ error: "Failed to load combo-only items" });
    }
  }

  if (req.method === "POST") {
    try {
      const item = await createComboOnlyItem(req.body);
      return res.status(201).json({ item });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
