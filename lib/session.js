import { getIronSession } from "iron-session";

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "restaurant_session",
  // ttl: 0 makes the cookie a session cookie (no Max-Age set in the browser).
  // The browser deletes it when the window/tab is closed.
  // The 12-hour inactivity check in requireAuth handles server-side expiry.
  ttl: 0,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

/**
 * Get the iron-session from an API route.
 *
 * Usage in an API handler:
 *   const session = await getSession(req, res);
 *   session.user  → the logged-in user, or undefined
 */
export function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
