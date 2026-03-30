import { requireAuth } from "../../../lib/apiAuth";
import { query } from "../../../lib/db";

/** Escapes a single CSV field value. */
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
 * GET /api/export/orders?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Downloads all orders in the date range as a CSV file.
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
         TO_CHAR(o.created_at, 'YYYY-MM-DD')    AS date,
         TO_CHAR(o.created_at, 'HH12:MI AM')    AS time,
         o.type,
         o.status,
         o.subtotal,
         o.tax,
         o.total,
         p.method   AS payment_method,
         p.status   AS payment_status,
         p.amount   AS amount_paid,
         t.name     AS table_name,
         w.name     AS waiter_name,
         o.customer_name,
         o.customer_phone,
         o.customer_address,
         cb.name    AS created_by
       FROM   orders o
       LEFT   JOIN payments p  ON p.order_id  = o.id
       LEFT   JOIN tables   t  ON t.id        = o.table_id
       LEFT   JOIN users    w  ON w.id        = o.waiter_id
       LEFT   JOIN users    cb ON cb.id       = o.created_by
       WHERE  DATE(o.created_at) BETWEEN $1 AND $2
       ORDER  BY o.created_at DESC`,
      [from, to]
    );

    const cols = [
      { key: "order_number",     label: "Order #"          },
      { key: "date",             label: "Date"             },
      { key: "time",             label: "Time"             },
      { key: "type",             label: "Type"             },
      { key: "status",           label: "Status"           },
      { key: "subtotal",         label: "Subtotal"         },
      { key: "tax",              label: "Tax"              },
      { key: "total",            label: "Total"            },
      { key: "payment_method",   label: "Payment Method"   },
      { key: "payment_status",   label: "Payment Status"   },
      { key: "amount_paid",      label: "Amount Paid"      },
      { key: "table_name",       label: "Table"            },
      { key: "waiter_name",      label: "Waiter"           },
      { key: "customer_name",    label: "Customer Name"    },
      { key: "customer_phone",   label: "Customer Phone"   },
      { key: "customer_address", label: "Customer Address" },
      { key: "created_by",       label: "Cashier"          },
    ];

    const csv      = toCSV(result.rows, cols);
    const filename = `orders-${from}-to-${to}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error("Export orders error:", err);
    return res.status(500).json({ error: "Failed to export orders." });
  }
}
