import { query } from "../lib/db";

// ─── Auth queries ────────────────────────────────────────────────────────────

/**
 * Find an active user by username — used for login.
 * Returns the full row including the password hash.
 */
export async function findByUsername(username) {
  const result = await query(
    `SELECT id, name, username, password, role, is_active
     FROM users
     WHERE username = $1 AND is_active = TRUE
     LIMIT 1`,
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Find a user by ID — used to refresh session data.
 * Never returns the password field.
 */
export async function findById(id) {
  const result = await query(
    `SELECT id, name, username, role, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

// ─── Management queries ──────────────────────────────────────────────────────

/**
 * Return all users ordered by creation date.
 * Never returns password fields.
 */
export async function getAllUsers() {
  const result = await query(
    `SELECT id, name, username, role, is_active, created_at
     FROM users
     ORDER BY created_at ASC`
  );
  return result.rows;
}

/**
 * Check if a username is already taken.
 * Pass excludeId to ignore the current user when editing.
 */
export async function isUsernameTaken(username, excludeId = null) {
  const result = excludeId
    ? await query(
        "SELECT id FROM users WHERE username = $1 AND id != $2 LIMIT 1",
        [username, excludeId]
      )
    : await query(
        "SELECT id FROM users WHERE username = $1 LIMIT 1",
        [username]
      );
  return result.rows.length > 0;
}

/**
 * Insert a new user row.
 * Password must already be hashed before calling this.
 */
export async function createUser({ name, username, password, role }) {
  const result = await query(
    `INSERT INTO users (name, username, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, username, role, is_active, created_at`,
    [name, username, password, role]
  );
  return result.rows[0];
}

/**
 * Update an existing user.
 * If password is null/undefined, it is left unchanged.
 */
export async function updateUser(id, { name, username, password, role }) {
  if (password) {
    const result = await query(
      `UPDATE users
       SET name = $1, username = $2, password = $3, role = $4
       WHERE id = $5
       RETURNING id, name, username, role, is_active`,
      [name, username, password, role, id]
    );
    return result.rows[0];
  }

  const result = await query(
    `UPDATE users
     SET name = $1, username = $2, role = $3
     WHERE id = $4
     RETURNING id, name, username, role, is_active`,
    [name, username, role, id]
  );
  return result.rows[0];
}

/**
 * Activate or deactivate a user.
 */
export async function setUserActive(id, isActive) {
  const result = await query(
    `UPDATE users SET is_active = $1 WHERE id = $2
     RETURNING id, is_active`,
    [isActive, id]
  );
  return result.rows[0];
}
