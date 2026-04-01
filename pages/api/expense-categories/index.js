import { requireAuth } from "../../../lib/apiAuth";
import { getCategories, addCategory } from "../../../services/expenseService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const categories = await getCategories();
      return res.status(200).json({ categories });
    } catch (err) {
      console.error("List categories error:", err);
      return res.status(500).json({ error: "Failed to load categories." });
    }
  }

  if (req.method === "POST") {
    const { name } = req.body;
    try {
      const category = await addCategory({ name });
      return res.status(201).json({ category });
    } catch (err) {
      console.error("Create category error:", err);
      return res.status(400).json({ error: err.message || "Failed to create category." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
