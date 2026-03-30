import { testConnection } from "../../lib/db";

/**
 * Temporary endpoint to verify database connectivity.
 * Remove this file (or restrict it) before going to production.
 *
 * GET /api/db-test
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const serverTime = await testConnection();
    return res.status(200).json({
      status: "connected",
      db_time: serverTime,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}
