import { json, readJson } from "@/lib/api";
import { adminPasswordOk, setAdminSession } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { recordFailure, tooManyFailures } from "@/lib/throttle";

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
  const ip = clientIp(req.headers);
  if ((await tooManyFailures(`admin-ip:${ip}`, 5, 15)) || (await tooManyFailures("admin-all", 30, 60))) {
    return json({ error: "Слишком много неудачных попыток. Попробуйте позже." }, 429);
  }
  if (typeof body?.password !== "string" || !adminPasswordOk(body.password)) {
    await Promise.all([recordFailure(`admin-ip:${ip}`), recordFailure("admin-all")]);
    return json({ error: "Неверный пароль" }, 401);
  }
  await setAdminSession();
  return json({ ok: true });
}
