import fs   from "fs";
import path from "path";
import { requireAuth } from "../../../lib/apiAuth";

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64, filename, mimeType } = req.body;

  if (!base64 || !filename || !mimeType) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(mimeType)) {
    return res.status(400).json({ error: "Invalid file type. Use JPG, PNG, WebP, or GIF." });
  }

  // Decode base64 (strip data URL prefix if present)
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const extMap = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = extMap[mimeType] || "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(uploadsDir, uniqueName), buffer);

  return res.status(200).json({ url: `/uploads/${uniqueName}` });
}
