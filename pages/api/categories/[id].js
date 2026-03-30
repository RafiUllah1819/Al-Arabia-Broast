import { requireAuth } from "../../../lib/apiAuth";
import { updateCategory, toggleCategoryActive } from "../../../services/categoryService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  // PUT — update name and sort_order
  if (req.method === "PUT") {
    try {
      const category = await updateCategory(id, req.body);
      return res.status(200).json({ category });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // PATCH — toggle is_active
  if (req.method === "PATCH") {
    try {
      const category = await toggleCategoryActive(id, req.body.is_active);
      return res.status(200).json({ category });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
