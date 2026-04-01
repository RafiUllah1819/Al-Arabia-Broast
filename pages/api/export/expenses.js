import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

// ── CSV helpers (same pattern as existing export routes) ─────────────────────

function csvField(v) {
  const s = (v == null ? "" : String(v)).replace(/"/g, '""');
  return /[,"\n\r]/.test(s) ? `"${s}"` : s;
}

function toCSV(rows, cols) {
  const header = cols.map((c) => csvField(c.label)).join(",");
  const body   = rows.map((r) => cols.map((c) => csvField(r[c.key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

/**
 * GET /api/export/expenses
 *
 * Query params:
 *   from        YYYY-MM-DD  (required)
 *   to          YYYY-MM-DD  (required)
 *   category_id number      (optional — filters to a single category)
 *   format      csv | json  (default: csv)
 *
 * Downloads expenses for the given date range as a CSV or JSON file.
 * Respects the same category filter that the Expenses page uses.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const { from, to, category_id, format = "csv" } = req.query;

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
    return res.status(400).json({ error: "from and to (YYYY-MM-DD) are required." });
  }

  try {
    const conditions = ["e.expense_date BETWEEN $1 AND $2"];
    const params     = [from, to];

    if (category_id) {
      params.push(category_id);
      conditions.push(`e.category_id = $${params.length}`);
    }

    const result = await query(
      `SELECT
         TO_CHAR(e.expense_date, 'YYYY-MM-DD')          AS date,
         ec.name                                         AS category,
         e.amount,
         COALESCE(e.vendor, '')                          AS vendor,
         e.payment_method,
         COALESCE(e.description, '')                     AS description,
         u.name                                          AS created_by,
         TO_CHAR(e.created_at, 'YYYY-MM-DD HH12:MI AM') AS created_at
       FROM   expenses e
       JOIN   expense_categories ec ON ec.id = e.category_id
       JOIN   users               u  ON u.id  = e.created_by
       WHERE  ${conditions.join(" AND ")}
       ORDER  BY e.expense_date DESC, e.created_at DESC`,
      params
    );

    const filename = `expenses-${from}-to-${to}`;

    // ── JSON ──────────────────────────────────────────────────────────────────
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
      return res.status(200).json({
        exportedAt: new Date().toISOString(),
        from,
        to,
        categoryFilter: category_id || null,
        totalRows:    result.rows.length,
        totalAmount:  result.rows.reduce((s, r) => s + parseFloat(r.amount), 0),
        rows: result.rows,
      });
    }

    // ── CSV ───────────────────────────────────────────────────────────────────
    const cols = [
      { key: "date",           label: "Date"           },
      { key: "category",       label: "Category"       },
      { key: "amount",         label: "Amount (Rs.)"   },
      { key: "vendor",         label: "Vendor"         },
      { key: "payment_method", label: "Payment Method" },
      { key: "description",    label: "Description"    },
      { key: "created_by",     label: "Added By"       },
      { key: "created_at",     label: "Recorded At"    },
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    return res.status(200).send(toCSV(result.rows, cols));
  } catch (err) {
    console.error("Export expenses error:", err);
    return res.status(500).json({ error: "Failed to export expenses." });
  }
}
