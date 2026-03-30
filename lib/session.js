import { getIronSession } from "iron-session";

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "restaurant_session",
  cookieOptions: {
    // Only send cookie over HTTPS in production
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
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
