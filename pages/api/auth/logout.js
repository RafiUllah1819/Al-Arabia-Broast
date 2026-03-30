import { getSession } from "../../../lib/session";

/**
 * POST /api/auth/logout
 *
 * Destroys the session cookie and returns 200.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getSession(req, res);
  session.destroy();

  return res.status(200).json({ ok: true });
}
