import { requireAuth } from "../../../lib/apiAuth";
import { getCategories, addCategory } from "../../../services/expenseService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  // GET — list categories
  // ?all=1  → all categories (management page)
  // default → active-only (expense form dropdown)
  if (req.method === "GET") {
    const activeOnly = req.query.all !== "1";
    try {
      const categories = await getCategories({ activeOnly });
      return res.status(200).json({ categories });
    } catch (err) {
      console.error("List categories error:", err);
      return res.status(500).json({ error: "Failed to load categories." });
    }
  }

  // POST — create category (admin only)
  if (req.method === "POST") {
    if (user.role !== "admin") return res.status(403).json({ error: "Admin only." });
    const { name, sortOrder } = req.body;
    try {
      const category = await addCategory({ name, sortOrder });
      return res.status(201).json({ category });
    } catch (err) {
      console.error("Create category error:", err);
      return res.status(400).json({ error: err.message || "Failed to create category." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
