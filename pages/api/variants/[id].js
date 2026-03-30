import { requireAuth } from "../../../lib/apiAuth";
import {
  updateVariant,
  toggleVariantAvailable,
  toggleVariantActive,
  deleteVariant,
} from "../../../services/variantService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  // PUT — full update (admin only)
  if (req.method === "PUT") {
    if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    try {
      const variant = await updateVariant(id, req.body);
      return res.status(200).json({ variant });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  // PATCH — toggle is_available (admin + manager) or is_active (admin only)
  if (req.method === "PATCH") {
    const { field, value } = req.body;
    try {
      if (field === "is_available") {
        const variant = await toggleVariantAvailable(id, value);
        return res.status(200).json({ variant });
      }
      if (field === "is_active") {
        if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
        const variant = await toggleVariantActive(id, value);
        return res.status(200).json({ variant });
      }
      return res.status(400).json({ error: "Unknown field" });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  // DELETE — admin only
  if (req.method === "DELETE") {
    if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    try {
      await deleteVariant(id);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
