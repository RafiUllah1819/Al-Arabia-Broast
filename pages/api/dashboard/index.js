import { requireAuth } from "../../../lib/apiAuth";
import {
  getDashboardStats,
  getTodayHourly,
  getRecentOrders,
  getTodayProductSales,
  getMonthlyProductSales,
} from "../../../repositories/reportRepository";
import {
  getTotalExpensesByDate,
  getTotalExpensesByRange,
} from "../../../repositories/expenseRepository";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const d          = new Date();
  const today      = d.toISOString().slice(0, 10);
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  try {
    const [stats, hourly, recentOrders, todaySales, monthlySales, todayExpenses, monthlyExpenses] = await Promise.all([
      getDashboardStats(),
      getTodayHourly(),
      getRecentOrders(10),
      getTodayProductSales(),
      getMonthlyProductSales(),
      getTotalExpensesByDate(today),
      getTotalExpensesByRange(monthStart, today),
    ]);

    // Attach all four financial figures to the stats object
    stats.today_expenses   = todayExpenses;
    stats.today_profit     = parseFloat(stats.today_revenue)   - todayExpenses;
    stats.monthly_expenses = monthlyExpenses;
    stats.monthly_profit   = parseFloat(stats.monthly_revenue) - monthlyExpenses;

    return res.status(200).json({ stats, hourly, recentOrders, todaySales, monthlySales });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ error: "Failed to load dashboard data" });
  }
}
