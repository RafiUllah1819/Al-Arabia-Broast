import fs   from "fs";
import path from "path";
import { requireAuth } from "../../../lib/apiAuth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager"]);
  if (!user) return;

  const { base64, filename, mimeType } = req.body;
  if (!base64 || !filename || !mimeType)
    return res.status(400).json({ error: "Missing required fields." });

  if (!ALLOWED.includes(mimeType))
    return res.status(400).json({ error: "Invalid file type. Use JPG, PNG, WebP, or GIF." });

  try {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > 2 * 1024 * 1024)
      return res.status(400).json({ error: "File too large (max 2 MB)." });

    const extMap  = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
    const ext      = extMap[mimeType] || "jpg";
    const saveName = `restaurant-logo.${ext}`;
    const dir      = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, saveName), buffer);

    return res.status(200).json({ url: `/uploads/${saveName}` });
  } catch {
    return res.status(500).json({ error: "Upload failed." });
  }
}
