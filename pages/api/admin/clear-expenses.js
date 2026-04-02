import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

/**
 * DELETE /api/admin/clear-expenses
 * Permanently deletes all expense records.
 * Admin-only.
 */
export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  try {
    await query(`TRUNCATE TABLE expenses RESTART IDENTITY CASCADE`);
    return res.status(200).json({ message: "All expense data cleared." });
  } catch (err) {
    console.error("Clear expenses error:", err);
    return res.status(500).json({ error: "Failed to clear expenses." });
  }
}
