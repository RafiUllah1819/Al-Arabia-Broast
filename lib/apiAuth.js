import { getSession } from "./session";

/**
 * Centralized API auth guard.
 *
 * Reads the session, checks the role against `allowedRoles`,
 * and sends the appropriate 401/403 response if the check fails.
 *
 * Returns the session user object on success, or null if the response
 * has already been sent (so callers can do `if (!user) return;`).
 *
 * Usage:
 *   const user = await requireAuth(req, res, ["admin", "manager"]);
 *   if (!user) return;
 *   // user.id, user.role, user.name are available here
 */
export async function requireAuth(req, res, allowedRoles = []) {
  const session = await getSession(req, res);

  if (!session.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return session.user;
}
