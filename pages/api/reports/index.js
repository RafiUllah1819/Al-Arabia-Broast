import { requireAuth } from "../../../lib/apiAuth";
import {
  getDailySalesReport,
  getTopProductsReport,
  getProductSalesReport,
  getPaymentSummaryReport,
  getCashierSalesReport,
} from "../../../repositories/reportRepository";

const REPORT_HANDLERS = {
  daily_sales:     getDailySalesReport,
  top_products:    getTopProductsReport,
  product_sales:   getProductSalesReport,
  payment_summary: getPaymentSummaryReport,
  cashier_sales:   getCashierSalesReport,
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const { type, from, to } = req.query;

  if (!REPORT_HANDLERS[type]) {
    return res.status(400).json({ error: `Unknown report type "${type}"` });
  }
  if (!from || !to) {
    return res.status(400).json({ error: "from and to date parameters are required" });
  }

  // Basic date format guard (YYYY-MM-DD)
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(from) || !dateRe.test(to)) {
    return res.status(400).json({ error: "Dates must be in YYYY-MM-DD format" });
  }

  try {
    const rows = await REPORT_HANDLERS[type](from, to);
    return res.status(200).json({ rows });
  } catch (err) {
    console.error(`Report error [${type}]:`, err);
    return res.status(500).json({ error: "Failed to generate report" });
  }
}
