import { query, withTransaction } from "../lib/db";

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories() {
  const res = await query(
    `SELECT id, name, sort_order
     FROM   expense_categories
     ORDER  BY sort_order, name`
  );
  return res.rows;
}

export async function createCategory(client, { name }) {
  const res = await client.query(
    `INSERT INTO expense_categories (name)
     VALUES ($1)
     RETURNING *`,
    [name.trim()]
  );
  return res.rows[0];
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function listExpenses({ dateFrom, dateTo, categoryId } = {}) {
  const conditions = [];
  const params     = [];

  if (dateFrom) { params.push(dateFrom); conditions.push(`e.expense_date >= $${params.length}`); }
  if (dateTo)   { params.push(dateTo);   conditions.push(`e.expense_date <= $${params.length}`); }
  if (categoryId) { params.push(categoryId); conditions.push(`e.category_id = $${params.length}`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query(
    `SELECT
       e.id,
       e.amount,
       e.description,
       e.vendor,
       e.payment_method,
       e.expense_date,
       e.created_at,
       e.updated_at,
       ec.id   AS category_id,
       ec.name AS category_name,
       u.name  AS created_by_name
     FROM   expenses e
     JOIN   expense_categories ec ON ec.id = e.category_id
     JOIN   users               u  ON u.id  = e.created_by
     ${where}
     ORDER  BY e.expense_date DESC, e.created_at DESC`,
    params
  );
  return res.rows;
}

export async function createExpense(client, {
  categoryId,
  amount,
  description,
  vendor,
  paymentMethod,
  expenseDate,
  createdBy,
}) {
  const res = await client.query(
    `INSERT INTO expenses
       (category_id, amount, description, vendor, payment_method, expense_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [categoryId, amount, description || null, vendor || null,
     paymentMethod || "cash", expenseDate, createdBy]
  );
  return res.rows[0];
}

export async function updateExpense(client, id, {
  categoryId,
  amount,
  description,
  vendor,
  paymentMethod,
  expenseDate,
}) {
  const res = await client.query(
    `UPDATE expenses
     SET  category_id    = $1,
          amount         = $2,
          description    = $3,
          vendor         = $4,
          payment_method = $5,
          expense_date   = $6,
          updated_at     = NOW()
     WHERE id = $7
     RETURNING *`,
    [categoryId, amount, description || null, vendor || null,
     paymentMethod || "cash", expenseDate, id]
  );
  return res.rows[0] || null;
}

export async function deleteExpense(client, id) {
  await client.query(`DELETE FROM expenses WHERE id = $1`, [id]);
}

// ── Profit / Loss helpers ─────────────────────────────────────────────────────

/**
 * Total expenses for a given date (YYYY-MM-DD).
 * Returns a plain number.
 */
export async function getTotalExpensesByDate(date) {
  const res = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM   expenses
     WHERE  expense_date = $1`,
    [date]
  );
  return parseFloat(res.rows[0].total);
}

/**
 * Expense breakdown by category for a date range.
 */
export async function getExpenseSummaryByCategory({ dateFrom, dateTo }) {
  const res = await query(
    `SELECT
       ec.name AS category,
       COUNT(e.id)       AS entry_count,
       SUM(e.amount)     AS total
     FROM   expenses e
     JOIN   expense_categories ec ON ec.id = e.category_id
     WHERE  e.expense_date BETWEEN $1 AND $2
     GROUP  BY ec.id, ec.name
     ORDER  BY total DESC`,
    [dateFrom, dateTo]
  );
  return res.rows;
}

/**
 * Daily expense totals within a date range — for the profit/loss table.
 */
export async function getDailyExpenseTotals({ dateFrom, dateTo }) {
  const res = await query(
    `SELECT
       TO_CHAR(expense_date, 'YYYY-MM-DD') AS date,
       SUM(amount)                          AS total_expenses
     FROM   expenses
     WHERE  expense_date BETWEEN $1 AND $2
     GROUP  BY expense_date
     ORDER  BY expense_date DESC`,
    [dateFrom, dateTo]
  );
  return res.rows;
}
