import bcrypt from "bcryptjs";
import { findByUsername } from "../repositories/userRepository";

/**
 * Verify login credentials.
 *
 * Returns a safe user object (no password) on success.
 * Throws a plain Error with a user-facing message on failure.
 */
export async function login(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  const user = await findByUsername(username.trim().toLowerCase());

  if (!user) {
    // Use a generic message — don't reveal whether the username exists
    throw new Error("Invalid username or password.");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new Error("Invalid username or password.");
  }

  // Return only what needs to be stored in the session — never the password
  return {
    id:       user.id,
    name:     user.name,
    username: user.username,
    role:     user.role,
  };
}
