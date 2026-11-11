import { json } from "@/lib/api";
import { clearCreatorSession } from "@/lib/auth";

export async function POST() {
  await clearCreatorSession();
  return json({ ok: true });
}
