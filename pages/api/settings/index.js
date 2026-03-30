import { requireAuth } from "../../../lib/apiAuth";
import { getSettings, updateSettings } from "../../../services/settingsService";

export default async function handler(req, res) {
  // GET — any authenticated user can read settings (needed for POS/receipts later)
  // PUT — admin only
  const user = await requireAuth(req, res, []);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const settings = await getSettings();
      return res.status(200).json({ settings });
    } catch (err) {
      console.error("Settings GET error:", err);
      return res.status(500).json({ error: "Failed to load settings" });
    }
  }

  if (req.method === "PUT") {
    if (user.role !== "admin") return res.status(403).json({ error: "Only admins can update settings" });
    try {
      const settings = await updateSettings(req.body);
      return res.status(200).json({ settings });
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
