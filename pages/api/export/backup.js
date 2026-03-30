import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

/**
 * GET /api/export/backup
 * Downloads a complete JSON backup of orders, payments, products, and settings.
 * Admin/manager only.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  try {
    const [ordersRes, paymentsRes, productsRes, settingsRes] = await Promise.all([
      query(
        `SELECT
           o.*,
           t.name  AS table_name,
           w.name  AS waiter_name,
           cb.name AS cashier_name
         FROM   orders o
         LEFT   JOIN tables t  ON t.id  = o.table_id
         LEFT   JOIN users  w  ON w.id  = o.waiter_id
         LEFT   JOIN users  cb ON cb.id = o.created_by
         ORDER  BY o.created_at DESC`
      ),
      query(
        `SELECT p.*, o.order_number
         FROM   payments p
         JOIN   orders   o ON o.id = p.order_id
         ORDER  BY p.paid_at DESC`
      ),
      query(
        `SELECT p.*, c.name AS category_name
         FROM   products    p
         LEFT   JOIN categories c ON c.id = p.category_id
         ORDER  BY p.name ASC`
      ),
      query(`SELECT key, value FROM settings`),
    ]);

    // Convert settings rows to a flat object for readability
    const settings = Object.fromEntries(
      settingsRes.rows.map((r) => [r.key, r.value])
    );

    const backup = {
      exported_at: new Date().toISOString(),
      exported_by: user.name || user.email,
      counts: {
        orders:   ordersRes.rows.length,
        payments: paymentsRes.rows.length,
        products: productsRes.rows.length,
      },
      settings,
      orders:   ordersRes.rows,
      payments: paymentsRes.rows,
      products: productsRes.rows,
    };

    const date     = new Date().toISOString().slice(0, 10);
    const filename = `backup-${date}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (err) {
    console.error("Backup error:", err);
    return res.status(500).json({ error: "Failed to generate backup." });
  }
}
