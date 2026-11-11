import { json } from "@/lib/api";
import { clearAdminSession } from "@/lib/auth";

export async function POST() {
  await clearAdminSession();
  return json({ ok: true });
}
