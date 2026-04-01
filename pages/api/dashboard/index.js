import { requireAuth } from "../../../lib/apiAuth";
import {
  getDashboardStats,
  getTodayHourly,
  getRecentOrders,
} from "../../../repositories/reportRepository";
import { getTotalExpensesByDate } from "../../../repositories/expenseRepository";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const [stats, hourly, recentOrders, todayExpenses] = await Promise.all([
      getDashboardStats(),
      getTodayHourly(),
      getRecentOrders(10),
      getTotalExpensesByDate(today),
    ]);

    // Attach expense/profit figures to the stats object
    stats.today_expenses = todayExpenses;
    stats.today_profit   = parseFloat(stats.today_revenue) - todayExpenses;

    return res.status(200).json({ stats, hourly, recentOrders });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ error: "Failed to load dashboard data" });
  }
}
