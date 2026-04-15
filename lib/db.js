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
 * When DB_TIMEZONE is set, the query runs inside a short transaction with
 * SET LOCAL TIME ZONE applied first. This guarantees that NOW(), CURRENT_DATE,
 * and EXTRACT(HOUR …) all reflect the restaurant's local time even on Neon,
 * whose transaction-mode PgBouncer pooler resets session-level settings between
 * transactions (making the old pool.on("connect") approach unreliable).
 *
 * Usage in a repository:
 *   import { query } from "../lib/db";
 *   const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
 *   return result.rows;
 */
export async function query(sql, params = []) {
  if (!process.env.DB_TIMEZONE) return pool.query(sql, params);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL TIME ZONE '${process.env.DB_TIMEZONE}'`);
    const result = await client.query(sql, params);
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
 * Run multiple queries inside a single transaction.
 * Automatically rolls back if any query throws.
 *
 * DB_TIMEZONE is applied at the start of the transaction so that any DEFAULT
 * NOW() during INSERT/UPDATE uses the restaurant's local time.
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
    if (process.env.DB_TIMEZONE) {
      await client.query(`SET LOCAL TIME ZONE '${process.env.DB_TIMEZONE}'`);
    }
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
