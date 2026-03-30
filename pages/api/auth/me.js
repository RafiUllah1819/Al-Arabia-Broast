import { getSession } from "../../../lib/session";

/**
 * GET /api/auth/me
 *
 * Returns the session user if logged in, or 401 if not.
 * Used by AuthContext on page load to hydrate the current user.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getSession(req, res);

  if (!session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  return res.status(200).json({ user: session.user });
}
