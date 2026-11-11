import { json, readJson } from "@/lib/api";
import { adminPasswordOk, setAdminSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!rateLimit(`admin-login:${clientIp(req.headers)}`, 10, 15 * 60 * 1000)) {
    return json({ error: "Слишком много попыток" }, 429);
  }
  let body: { password?: unknown } | null = null;
  try {
    body = (await readJson(req)) as { password?: unknown } | null;
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (typeof body?.password !== "string" || !adminPasswordOk(body.password)) {
    return json({ error: "Неверный пароль" }, 401);
  }
  await setAdminSession();
  return json({ ok: true });
}
