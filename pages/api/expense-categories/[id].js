import { requireAuth } from "../../../lib/apiAuth";
import { editCategory, toggleCategory } from "../../../services/expenseService";

export default async function handler(req, res) {
  // Both operations are admin-only
  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  const { id } = req.query;

  // PUT — edit name / sort_order
  if (req.method === "PUT") {
    const { name, sortOrder } = req.body;
    try {
      const category = await editCategory(id, { name, sortOrder });
      if (!category) return res.status(404).json({ error: "Category not found." });
      return res.status(200).json({ category });
    } catch (err) {
      console.error("Update category error:", err);
      return res.status(400).json({ error: err.message || "Failed to update category." });
    }
  }

  // PATCH — toggle active / inactive
  if (req.method === "PATCH") {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive (boolean) is required." });
    }
    try {
      const category = await toggleCategory(id, isActive);
      if (!category) return res.status(404).json({ error: "Category not found." });
      return res.status(200).json({ category });
    } catch (err) {
      console.error("Toggle category error:", err);
      return res.status(500).json({ error: "Failed to update category." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
