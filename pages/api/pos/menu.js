import { requireAuth } from "../../../lib/apiAuth";
import { getPOSMenu } from "../../../repositories/posRepository";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireAuth(req, res, ["admin", "manager", "cashier"]);
  if (!user) return;

  try {
    const data = await getPOSMenu();
    return res.status(200).json(data);
  } catch (err) {
    console.error(`POS menu error [step: ${err._step || "unknown"}]:`, err.message);
    return res.status(500).json({ error: "Failed to load menu" });
  }
}
