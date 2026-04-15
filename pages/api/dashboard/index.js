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

/**
 * Returns the current date as 'YYYY-MM-DD' in the restaurant's configured
 * timezone (DB_TIMEZONE env var, e.g. 'Asia/Karachi').
 * Falls back to UTC when the variable is not set.
 *
 * Using Intl.DateTimeFormat with 'en-CA' locale gives ISO-style date strings
 * ('YYYY-MM-DD') with no extra library required.
 */
function getLocalDateStr(tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  // Compute dates in the restaurant's local timezone so midnight boundaries
  // are correct regardless of the UTC clock on the database server.
  const tz         = process.env.DB_TIMEZONE || "UTC";
  const today      = getLocalDateStr(tz);
  const monthStart = `${today.slice(0, 7)}-01`;

  try {
    const [stats, hourly, recentOrders, todaySales, monthlySales, todayExpenses, monthlyExpenses] = await Promise.all([
      getDashboardStats(today, monthStart),
      getTodayHourly(today),
      getRecentOrders(10),
      getTodayProductSales(today),
      getMonthlyProductSales(monthStart, today),
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
