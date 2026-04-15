import { Pool } from "pg";

// Reuse the pool across hot reloads in development.
// SSL is explicitly required for Neon (and any production PostgreSQL host).
if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

const pool = global._pgPool;

/**
 * Run a single SQL query.
 *
 * Usage in a repository:
 *   import { query } from "../lib/db";
 *   const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
 *   return result.rows;
 */
export async function query(sql, params = []) {
  return pool.query(sql, params);
}

/**
 * Run multiple queries inside a single transaction.
 * Automatically rolls back if any query throws.
 *
 * orders.created_at is stored in UTC (the pg library treats TIMESTAMP columns
 * as UTC when building JS Date objects and JSON-serialising them with a Z
 * suffix, so storing local time here would cause a +5 h display shift in the
 * browser).  Date filtering in the dashboard/reports uses
 * AT TIME ZONE conversion inside SQL instead — see reportRepository.js.
 *
 * Usage:
 *   import { withTransaction } from "../lib/db";
 *   await withTransaction(async (client) => {
 *     await client.query("INSERT INTO orders ...", [...]);
 *     await client.query("INSERT INTO order_items ...", [...]);
 *   });
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Quick connectivity check — used by the /api/db-test endpoint.
 * Returns true if the database is reachable, throws if not.
 */
export async function testConnection() {
  const result = await query("SELECT NOW() AS time");
  return result.rows[0].time;
}

export default pool;
