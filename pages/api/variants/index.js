import { requireAuth } from "../../../lib/apiAuth";
import { listVariants, createVariant } from "../../../services/variantService";

export default async function handler(req, res) {
  const minRole = req.method === "POST" ? ["admin"] : ["admin", "manager"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  // GET /api/variants?product_id=X
  if (req.method === "GET") {
    const { product_id } = req.query;
    if (!product_id) return res.status(400).json({ error: "product_id is required" });
    try {
      const variants = await listVariants(parseInt(product_id));
      return res.status(200).json({ variants });
    } catch {
      return res.status(500).json({ error: "Failed to load variants" });
    }
  }

  // POST /api/variants — admin only
  if (req.method === "POST") {
    try {
      const variant = await createVariant(req.body);
      return res.status(201).json({ variant });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
