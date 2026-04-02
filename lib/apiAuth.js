import { getSession } from "./session";

const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Centralized API auth guard.
 *
 * - Returns 401 if no session exists.
 * - Returns 401 if the session has been inactive for more than 12 hours.
 * - Returns 403 if the user's role is not in allowedRoles.
 * - On success: refreshes lastActivity, saves the session, and returns the user.
 *
 * Usage:
 *   const user = await requireAuth(req, res, ["admin", "manager"]);
 *   if (!user) return;
 */
export async function requireAuth(req, res, allowedRoles = []) {
  const session = await getSession(req, res);

  if (!session.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  // Enforce 12-hour inactivity timeout
  const now = Date.now();
  if (session.user.lastActivity && now - session.user.lastActivity > INACTIVITY_LIMIT_MS) {
    await session.destroy();
    res.status(401).json({ error: "Session expired" });
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  // Refresh lastActivity on every successful request
  session.user = { ...session.user, lastActivity: now };
  await session.save();

  return session.user;
}
