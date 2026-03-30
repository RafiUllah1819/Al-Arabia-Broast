import { requireAuth } from "../../../lib/apiAuth";
import { updateTableRecord, changeTableStatus, toggleTableActive } from "../../../services/tableService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  if (req.method === "PUT") {
    try {
      const table = await updateTableRecord(id, req.body);
      return res.status(200).json({ table });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    const { field, value } = req.body;
    try {
      if (field === "status")    return res.status(200).json({ table: await changeTableStatus(id, value) });
      if (field === "is_active") return res.status(200).json({ table: await toggleTableActive(id, value) });
      return res.status(400).json({ error: "Unknown field" });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
