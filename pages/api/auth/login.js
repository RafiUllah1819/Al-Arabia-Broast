import { login } from "../../../services/authService";
import { getSession } from "../../../lib/session";
import { getRoleHome } from "../../../lib/roles";

/**
 * POST /api/auth/login
 * Body: { username, password }
 *
 * On success: saves user to session and returns { user, redirectTo }
 * On failure: returns 401 with an error message
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  try {
    const user = await login(username, password);

    // Save the user into the encrypted session cookie.
    // lastActivity is used by requireAuth to enforce 12-hour inactivity logout.
    const session = await getSession(req, res);
    session.user = { ...user, lastActivity: Date.now() };
    await session.save();

    return res.status(200).json({
      user,
      redirectTo: getRoleHome(user.role),
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}
