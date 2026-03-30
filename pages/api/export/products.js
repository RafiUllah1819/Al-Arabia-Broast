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
 * GET /api/export/products
 * Downloads the full product catalogue as a CSV file.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  try {
    const result = await query(
      `SELECT
         p.id,
         p.name,
         p.description,
         c.name       AS category,
         p.base_price,
         p.is_active,
         TO_CHAR(p.created_at, 'YYYY-MM-DD') AS created_date
       FROM   products    p
       LEFT   JOIN categories c ON c.id = p.category_id
       ORDER  BY c.name ASC, p.name ASC`
    );

    const cols = [
      { key: "id",           label: "ID"           },
      { key: "name",         label: "Name"         },
      { key: "description",  label: "Description"  },
      { key: "category",     label: "Category"     },
      { key: "base_price",   label: "Base Price"   },
      { key: "is_active",    label: "Active"       },
      { key: "created_date", label: "Created"      },
    ];

    const csv = toCSV(result.rows, cols);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="products.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error("Export products error:", err);
    return res.status(500).json({ error: "Failed to export products." });
  }
}
