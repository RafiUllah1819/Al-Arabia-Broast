import { requireAuth } from "../../../lib/apiAuth";
import { getRangeProfitLoss } from "../../../services/expenseService";

// ── CSV helpers ───────────────────────────────────────────────────────────────

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
 * GET /api/export/profit-loss
 *
 * Query params:
 *   from    YYYY-MM-DD  (required)
 *   to      YYYY-MM-DD  (required)
 *   format  csv | json  (default: csv)
 *
 * Downloads a daily profit/loss report for the given date range.
 * CSV includes a TOTAL row at the bottom.
 * JSON includes rows, totals, and expense category breakdown.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const { from, to, format = "csv" } = req.query;

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
    return res.status(400).json({ error: "from and to (YYYY-MM-DD) are required." });
  }

  try {
    const { rows, totals, categoryBreakdown } = await getRangeProfitLoss(from, to);

    const filename = `profit-loss-${from}-to-${to}`;

    // ── JSON ──────────────────────────────────────────────────────────────────
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
      return res.status(200).json({
        exportedAt: new Date().toISOString(),
        from,
        to,
        rows,
        totals,
        categoryBreakdown,
      });
    }

    // ── CSV ───────────────────────────────────────────────────────────────────
    const cols = [
      { key: "date",     label: "Date"             },
      { key: "sales",    label: "Sales (Rs.)"      },
      { key: "expenses", label: "Expenses (Rs.)"   },
      { key: "profit",   label: "Profit/Loss (Rs.)" },
    ];

    // Append a TOTAL row
    const csvRows = [
      ...rows,
      {
        date:     "TOTAL",
        sales:    totals.sales.toFixed(2),
        expenses: totals.expenses.toFixed(2),
        profit:   totals.profit.toFixed(2),
      },
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    return res.status(200).send(toCSV(csvRows, cols));
  } catch (err) {
    console.error("Export profit-loss error:", err);
    return res.status(500).json({ error: "Failed to export profit/loss report." });
  }
}
