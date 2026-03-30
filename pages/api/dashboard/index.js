import { requireAuth } from "../../../lib/apiAuth";
import {
  getDashboardStats,
  getTodayHourly,
  getRecentOrders,
} from "../../../repositories/reportRepository";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  try {
    const [stats, hourly, recentOrders] = await Promise.all([
      getDashboardStats(),
      getTodayHourly(),
      getRecentOrders(10),
    ]);
    return res.status(200).json({ stats, hourly, recentOrders });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ error: "Failed to load dashboard data" });
  }
}
