import { query } from "../lib/db";

export async function getAllTables({ activeOnly = false } = {}) {
  const where = activeOnly ? "WHERE is_active = TRUE" : "";
  const result = await query(
    `SELECT id, name, capacity, status, is_active
     FROM   tables
     ${where}
     ORDER  BY name ASC`
  );
  return result.rows;
}

export async function createTable({ name, capacity, status, is_active }) {
  const result = await query(
    `INSERT INTO tables (name, capacity, status, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, capacity, status, is_active]
  );
  return result.rows[0];
}

export async function updateTable(id, { name, capacity, status, is_active }) {
  const result = await query(
    `UPDATE tables
     SET name = $1, capacity = $2, status = $3, is_active = $4
     WHERE id = $5
     RETURNING *`,
    [name, capacity, status, is_active, id]
  );
  return result.rows[0];
}

export async function setTableStatus(id, status) {
  const result = await query(
    `UPDATE tables SET status = $1 WHERE id = $2 RETURNING id, status`,
    [status, id]
  );
  return result.rows[0];
}

export async function setTableActive(id, is_active) {
  const result = await query(
    `UPDATE tables SET is_active = $1 WHERE id = $2 RETURNING id, is_active`,
    [is_active, id]
  );
  return result.rows[0];
}
