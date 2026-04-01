import { withTransaction } from "../lib/db";
import {
  listCategories,
  createCategory,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getTotalExpensesByDate,
  getExpenseSummaryByCategory,
  getDailyExpenseTotals,
} from "../repositories/expenseRepository";
import { getDailySalesReport } from "../repositories/reportRepository";

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories() {
  return listCategories();
}

export async function addCategory({ name }) {
  if (!name?.trim()) throw new Error("Category name is required.");
  return withTransaction((client) => createCategory(client, { name }));
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function getExpenses({ dateFrom, dateTo, categoryId } = {}) {
  return listExpenses({ dateFrom, dateTo, categoryId });
}

export async function addExpense({
  categoryId,
  amount,
  description,
  vendor,
  paymentMethod,
  expenseDate,
  createdBy,
}) {
  if (!categoryId)    throw new Error("Category is required.");
  if (!amount || parseFloat(amount) <= 0) throw new Error("Amount must be greater than zero.");
  if (!expenseDate)   throw new Error("Expense date is required.");
  if (!createdBy)     throw new Error("Created by is required.");

  return withTransaction((client) =>
    createExpense(client, {
      categoryId: parseInt(categoryId),
      amount:     parseFloat(amount),
      description,
      vendor,
      paymentMethod,
      expenseDate,
      createdBy,
    })
  );
}

export async function editExpense(id, {
  categoryId,
  amount,
  description,
  vendor,
  paymentMethod,
  expenseDate,
}) {
  if (!id)            throw new Error("Expense ID is required.");
  if (!categoryId)    throw new Error("Category is required.");
  if (!amount || parseFloat(amount) <= 0) throw new Error("Amount must be greater than zero.");
  if (!expenseDate)   throw new Error("Expense date is required.");

  return withTransaction((client) =>
    updateExpense(client, id, {
      categoryId: parseInt(categoryId),
      amount:     parseFloat(amount),
      description,
      vendor,
      paymentMethod,
      expenseDate,
    })
  );
}

export async function removeExpense(id) {
  if (!id) throw new Error("Expense ID is required.");
  return withTransaction((client) => deleteExpense(client, id));
}

// ── Profit / Loss ─────────────────────────────────────────────────────────────

/**
 * Daily profit/loss for a single date.
 * Returns: { date, sales, expenses, profit }
 */
export async function getDailyProfitLoss(date) {
  const [salesRows, expenses] = await Promise.all([
    getDailySalesReport(date, date),
    getTotalExpensesByDate(date),
  ]);
  const sales  = salesRows.length > 0 ? parseFloat(salesRows[0].revenue) : 0;
  const profit = sales - expenses;
  return { date, sales, expenses, profit };
}

/**
 * Profit/loss summary for a date range.
 * Returns merged rows: { date, sales, expenses, profit }
 */
export async function getRangeProfitLoss(dateFrom, dateTo) {
  const [salesRows, expenseRows, categoryBreakdown] = await Promise.all([
    getDailySalesReport(dateFrom, dateTo),
    getDailyExpenseTotals({ dateFrom, dateTo }),
    getExpenseSummaryByCategory({ dateFrom, dateTo }),
  ]);

  // Build a map keyed by date for quick merge
  const salesMap   = Object.fromEntries(salesRows.map((r)   => [r.date, parseFloat(r.revenue)]));
  const expenseMap = Object.fromEntries(expenseRows.map((r) => [r.date, parseFloat(r.total_expenses)]));

  // Union of all dates that appear in either dataset
  const allDates = [...new Set([...Object.keys(salesMap), ...Object.keys(expenseMap)])];
  allDates.sort((a, b) => b.localeCompare(a)); // descending

  const rows = allDates.map((date) => {
    const sales    = salesMap[date]   || 0;
    const expenses = expenseMap[date] || 0;
    return { date, sales, expenses, profit: sales - expenses };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      sales:    acc.sales    + r.sales,
      expenses: acc.expenses + r.expenses,
      profit:   acc.profit   + r.profit,
    }),
    { sales: 0, expenses: 0, profit: 0 }
  );

  return { rows, totals, categoryBreakdown };
}
