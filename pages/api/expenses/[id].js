import { requireAuth } from "../../../lib/apiAuth";
import { editExpense, removeExpense } from "../../../services/expenseService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const { id } = req.query;

  if (req.method === "PUT") {
    const { categoryId, amount, description, vendor, paymentMethod, expenseDate } = req.body;
    try {
      const expense = await editExpense(id, {
        categoryId, amount, description, vendor, paymentMethod, expenseDate,
      });
      if (!expense) return res.status(404).json({ error: "Expense not found." });
      return res.status(200).json({ expense });
    } catch (err) {
      console.error("Update expense error:", err);
      return res.status(400).json({ error: err.message || "Failed to update expense." });
    }
  }

  if (req.method === "DELETE") {
    try {
      await removeExpense(id);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Delete expense error:", err);
      return res.status(500).json({ error: "Failed to delete expense." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
