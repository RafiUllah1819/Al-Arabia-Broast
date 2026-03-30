import { requireAuth } from "../../../lib/apiAuth";
import { updateUser, toggleUserActive } from "../../../services/userService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

  // PUT /api/users/:id — update name, username, password, role
  if (req.method === "PUT") {
    try {
      const updated = await updateUser(id, req.body);
      return res.status(200).json({ user: updated });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  // PATCH /api/users/:id — toggle active/inactive
  if (req.method === "PATCH") {
    // Prevent admin from deactivating their own account
    if (id === user.id) {
      return res.status(400).json({ error: "You cannot deactivate your own account." });
    }
    try {
      const { is_active } = req.body;
      const updated = await toggleUserActive(id, is_active);
      return res.status(200).json({ user: updated });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
