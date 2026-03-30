import { requireAuth } from "../../../lib/apiAuth";
import { listTables, createTableRecord } from "../../../services/tableService";

export default async function handler(req, res) {
  // GET: all staff roles (needed for POS table selector)
  // POST: admin + manager only
  const minRole = req.method === "POST"
    ? ["admin", "manager"]
    : ["admin", "manager", "cashier", "waiter"];
  const user = await requireAuth(req, res, minRole);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const activeOnly = req.query.active === "true";
      const tables = await listTables({ activeOnly });
      return res.status(200).json({ tables });
    } catch {
      return res.status(500).json({ error: "Failed to load tables" });
    }
  }

  if (req.method === "POST") {
    try {
      const table = await createTableRecord(req.body);
      return res.status(201).json({ table });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
