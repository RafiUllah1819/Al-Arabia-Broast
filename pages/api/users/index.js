import { requireAuth } from "../../../lib/apiAuth";
import { listUsers, createUser } from "../../../services/userService";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin"]);
  if (!user) return;

  // GET /api/users — list all users
  if (req.method === "GET") {
    try {
      const users = await listUsers();
      return res.status(200).json({ users });
    } catch {
      return res.status(500).json({ error: "Failed to load users" });
    }
  }

  // POST /api/users — create a new user
  if (req.method === "POST") {
    try {
      const newUser = await createUser(req.body);
      return res.status(201).json({ user: newUser });
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
