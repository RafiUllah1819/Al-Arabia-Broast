import { requireAuth } from "../../../lib/apiAuth";
import {
  updateProduct,
  toggleProductAvailable,
  toggleProductActive,
} from "../../../services/productService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  // PUT — full update (admin only)
  if (req.method === "PUT") {
    if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    try {
      const product = await updateProduct(id, req.body);
      return res.status(200).json({ product });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  // PATCH — toggle availability or active status
  if (req.method === "PATCH") {
    try {
      const { field, value } = req.body;

      // Managers can only toggle availability
      if (field === "is_available") {
        const product = await toggleProductAvailable(id, value);
        return res.status(200).json({ product });
      }

      // Toggling active is admin-only
      if (field === "is_active") {
        if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
        const product = await toggleProductActive(id, value);
        return res.status(200).json({ product });
      }

      return res.status(400).json({ error: "Unknown field" });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
