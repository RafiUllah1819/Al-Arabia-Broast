import { requireAuth } from "../../../lib/apiAuth";
import { listCategories, createCategory } from "../../../services/categoryService";

export default async function handler(req, res) {
  // GET — admin + manager (managers need categories for the menu filter dropdown)
  // POST — admin only
  const minRole = req.method === "POST" ? ["admin"] : ["admin", "manager"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const categories = await listCategories();
      return res.status(200).json({ categories });
    } catch {
      return res.status(500).json({ error: "Failed to load categories" });
    }
  }

  if (req.method === "POST") {
    try {
      const category = await createCategory(req.body);
      return res.status(201).json({ category });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
