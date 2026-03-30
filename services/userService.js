import bcrypt from "bcryptjs";
import {
  getAllUsers,
  createUser as repoCreate,
  updateUser as repoUpdate,
  setUserActive,
  isUsernameTaken,
} from "../repositories/userRepository";

const VALID_ROLES = ["admin", "manager", "cashier", "kitchen", "waiter"];

export function listUsers() {
  return getAllUsers();
}

export async function createUser({ name, username, password, role }) {
  if (!name?.trim())     throw new Error("Name is required.");
  if (!username?.trim()) throw new Error("Username is required.");
  if (!password)         throw new Error("Password is required.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!VALID_ROLES.includes(role)) throw new Error("Invalid role selected.");

  const cleanUsername = username.trim().toLowerCase();

  if (await isUsernameTaken(cleanUsername)) {
    throw new Error("Username is already taken.");
  }

  return repoCreate({
    name:     name.trim(),
    username: cleanUsername,
    password: await bcrypt.hash(password, 10),
    role,
  });
}

export async function updateUser(id, { name, username, password, role }) {
  if (!name?.trim())     throw new Error("Name is required.");
  if (!username?.trim()) throw new Error("Username is required.");
  if (!VALID_ROLES.includes(role)) throw new Error("Invalid role selected.");
  if (password && password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const cleanUsername = username.trim().toLowerCase();

  if (await isUsernameTaken(cleanUsername, id)) {
    throw new Error("Username is already taken.");
  }

  return repoUpdate(id, {
    name:     name.trim(),
    username: cleanUsername,
    password: password ? await bcrypt.hash(password, 10) : null,
    role,
  });
}

export function toggleUserActive(id, isActive) {
  return setUserActive(id, isActive);
}
