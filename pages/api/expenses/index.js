import { requireAuth } from "../../../lib/apiAuth";
import { getExpenses, addExpense } from "../../../services/expenseService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  if (req.method === "GET") {
    const { date_from, date_to, category_id } = req.query;
    try {
      const expenses = await getExpenses({
        dateFrom:   date_from   || "",
        dateTo:     date_to     || "",
        categoryId: category_id || "",
      });
      return res.status(200).json({ expenses });
    } catch (err) {
      console.error("List expenses error:", err);
      return res.status(500).json({ error: "Failed to load expenses." });
    }
  }

  if (req.method === "POST") {
    const { categoryId, amount, description, vendor, paymentMethod, expenseDate } = req.body;
    try {
      const expense = await addExpense({
        categoryId,
        amount,
        description,
        vendor,
        paymentMethod,
        expenseDate,
        createdBy: user.id,
      });
      return res.status(201).json({ expense });
    } catch (err) {
      console.error("Create expense error:", err);
      return res.status(400).json({ error: err.message || "Failed to create expense." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
