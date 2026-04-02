import { Pool } from "pg";

// Reuse the pool across hot reloads in development.
// SSL is explicitly required for Neon (and any production PostgreSQL host).
if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Set a consistent timezone on every connection so that DATE(), CURRENT_DATE,
  // and NOW() all use the restaurant's local time — not the database server's
  // system clock. Without this, orders placed before midnight but paid/completed
  // after midnight could be assigned to the wrong day on any UTC-based server.
  //
  // Set DB_TIMEZONE in your .env.local (e.g. DB_TIMEZONE=Asia/Karachi).
  // If not set, the server's default timezone is used (fine for local dev).
  if (process.env.DB_TIMEZONE) {
    global._pgPool.on("connect", (client) => {
      client.query(`SET TIME ZONE '${process.env.DB_TIMEZONE}'`);
    });
  }
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
  const result = await pool.query(sql, params);
  return result;
}

/**
 * Run multiple queries inside a single transaction.
 * Automatically rolls back if any query throws.
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
