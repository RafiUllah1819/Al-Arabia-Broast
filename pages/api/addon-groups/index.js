import { requireAuth } from "../../../lib/apiAuth";
import { listAddonGroups, createAddonGroup } from "../../../services/addonService";

export default async function handler(req, res) {
  const minRole = req.method === "POST" ? ["admin"] : ["admin", "manager"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const groups = await listAddonGroups();
      return res.status(200).json({ groups });
    } catch {
      return res.status(500).json({ error: "Failed to load addon groups" });
    }
  }

  if (req.method === "POST") {
    try {
      const group = await createAddonGroup(req.body);
      return res.status(201).json({ group });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
