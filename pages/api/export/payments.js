import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

function csvField(v) {
  const s = (v == null ? "" : String(v)).replace(/"/g, '""');
  return /[,"\n\r]/.test(s) ? `"${s}"` : s;
}

function toCSV(rows, cols) {
  const header = cols.map((c) => csvField(c.label)).join(",");
  const body   = rows.map((r) => cols.map((c) => csvField(r[c.key])).join(",")).join("\n");
  return header + "\n" + body;
}

/**
 * GET /api/export/payments?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Downloads all payments in the date range as a CSV file.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const { from, to } = req.query;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
    return res.status(400).json({ error: "from and to (YYYY-MM-DD) are required." });
  }

  try {
    const result = await query(
      `SELECT
         o.order_number,
         TO_CHAR(p.paid_at, 'YYYY-MM-DD')   AS date,
         TO_CHAR(p.paid_at, 'HH12:MI AM')   AS time,
         o.type                             AS order_type,
         p.method,
         p.status,
         p.amount,
         p.change_due,
         p.reference,
         cb.name AS cashier
       FROM   payments p
       JOIN   orders o  ON o.id  = p.order_id
       LEFT   JOIN users cb ON cb.id = o.created_by
       WHERE  DATE(o.created_at) BETWEEN $1 AND $2
       ORDER  BY p.paid_at DESC`,
      [from, to]
    );

    const cols = [
      { key: "order_number", label: "Order #"      },
      { key: "date",         label: "Date"          },
      { key: "time",         label: "Time"          },
      { key: "order_type",   label: "Order Type"    },
      { key: "method",       label: "Method"        },
      { key: "status",       label: "Status"        },
      { key: "amount",       label: "Amount"        },
      { key: "change_due",   label: "Change Given"  },
      { key: "reference",    label: "Reference"     },
      { key: "cashier",      label: "Cashier"       },
    ];

    const csv      = toCSV(result.rows, cols);
    const filename = `payments-${from}-to-${to}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error("Export payments error:", err);
    return res.status(500).json({ error: "Failed to export payments." });
  }
}
