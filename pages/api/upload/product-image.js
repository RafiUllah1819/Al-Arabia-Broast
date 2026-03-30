import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "../../../lib/apiAuth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  // Ensure it's a proper data URL for Cloudinary
  const dataUrl = base64.startsWith("data:")
    ? base64
    : `data:${mimeType};base64,${base64}`;

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "restaurant/products",
      resource_type: "image",
    });

    return res.status(200).json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({ error: "Upload failed." });
  }
}
