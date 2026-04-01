import { requireAuth } from "../../../lib/apiAuth";
import {
  getSummaryStats,
  getRangeProfitLoss,
} from "../../../services/expenseService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const d          = new Date();
  const todayStr   = d.toISOString().slice(0, 10);
  const monthStr   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  const rangeFrom = req.query.date_from || monthStr;
  const rangeTo   = req.query.date_to   || todayStr;

  try {
    // Always fetch today + this-month snapshots alongside the requested range.
    const [summary, range] = await Promise.all([
      getSummaryStats(),
      getRangeProfitLoss(rangeFrom, rangeTo),
    ]);

    return res.status(200).json({
      today: summary.today,
      month: summary.month,
      range,
    });
  } catch (err) {
    console.error("Profit/loss error:", err);
    return res.status(500).json({ error: "Failed to load profit/loss data." });
  }
}
