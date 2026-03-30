import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "../../../lib/apiAuth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  // Ensure it's a proper data URL for Cloudinary
  const dataUrl = base64.startsWith("data:")
    ? base64
    : `data:${mimeType};base64,${base64}`;

  // Check size before uploading (base64 is ~33% larger than binary)
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const approxBytes = Math.ceil((base64Data.length * 3) / 4);
  if (approxBytes > 2 * 1024 * 1024)
    return res.status(400).json({ error: "File too large (max 2 MB)." });

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "restaurant",
      public_id: "logo",
      overwrite: true,
      resource_type: "image",
    });

    return res.status(200).json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({ error: "Upload failed." });
  }
}
