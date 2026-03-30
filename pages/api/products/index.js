import { requireAuth } from "../../../lib/apiAuth";
import { listProducts, createProduct } from "../../../services/productService";

export default async function handler(req, res) {
  const minRole = req.method === "POST" ? ["admin"] : ["admin", "manager"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const products = await listProducts({ category_id: req.query.category_id || null });
      return res.status(200).json({ products });
    } catch {
      return res.status(500).json({ error: "Failed to load products" });
    }
  }

  if (req.method === "POST") {
    try {
      const product = await createProduct(req.body);
      return res.status(201).json({ product });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
