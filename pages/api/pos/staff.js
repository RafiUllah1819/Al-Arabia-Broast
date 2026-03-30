import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

// Returns active staff who can be assigned as a waiter on an order.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier", "waiter"]);
  if (!user) return;

  try {
    const result = await query(
      `SELECT id, name, role
       FROM   users
       WHERE  is_active = TRUE
         AND  role = 'waiter'
       ORDER  BY name ASC`
    );
    return res.status(200).json({ staff: result.rows });
  } catch (err) {
    console.error("POS staff error:", err);
    return res.status(500).json({ error: "Failed to load staff" });
  }
}
