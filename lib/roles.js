// Single source of truth for role-based access.
// Key = page path, Value = roles that can access it.

export const ROLE_ACCESS = {
  "/dashboard":   ["admin", "manager"],
  "/pos":         ["admin", "manager", "cashier", "waiter"],
  "/kitchen":     ["admin", "manager", "kitchen"],
  "/orders":      ["admin", "manager", "cashier", "waiter"],
  "/tables":      ["admin", "manager"],
  "/menu":        ["admin", "manager"],
  "/payments":    ["admin", "manager", "cashier", "waiter"],
  "/reports":     ["admin", "manager"],
  "/expenses":            ["admin", "manager"],
  "/expense-categories":  ["admin", "manager"],
  "/profit-loss":         ["admin", "manager"],
  "/users":       ["admin"],
  "/staff":       ["admin"],
  "/settings":    ["admin"],
};

// Where each role lands immediately after login.
export const ROLE_HOME = {
  admin:   "/dashboard",
  manager: "/dashboard",
  cashier: "/pos",
  kitchen: "/kitchen",
  waiter:  "/pos",
};

/**
 * Returns true if the role can access the given pathname.
 * Paths not listed in ROLE_ACCESS are open to any logged-in user.
 */
export function canAccess(role, pathname) {
  const allowed = ROLE_ACCESS[pathname];
  if (!allowed) return true;
  return allowed.includes(role);
}

/**
 * Returns the first page the role should see after login.
 */
export function getRoleHome(role) {
  return ROLE_HOME[role] || "/dashboard";
}
