import { requireAuth } from "../../../lib/apiAuth";
import { getDailyProfitLoss, getRangeProfitLoss } from "../../../services/expenseService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const { date_from, date_to } = req.query;

  try {
    if (date_from && date_to) {
      const data = await getRangeProfitLoss(date_from, date_to);
      return res.status(200).json(data);
    }

    // Default: today
    const today = new Date().toISOString().slice(0, 10);
    const data  = await getDailyProfitLoss(date_from || today);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Profit/loss error:", err);
    return res.status(500).json({ error: "Failed to load profit/loss data." });
  }
}
