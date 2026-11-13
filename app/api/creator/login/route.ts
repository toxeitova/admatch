import { json, readJson, serverError } from "@/lib/api";
import { setCreatorSession, verifyPassword } from "@/lib/auth";
import { findAccountByEmail, touchLogin } from "@/lib/creatorData";
import { loginSchema } from "@/lib/creatorValidation";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { recordFailure, tooManyFailures } from "@/lib/throttle";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Проверьте email и пароль" }, 400);
  if (!rateLimit(`creator-login:${clientIp(req.headers)}`, 20, 15 * 60 * 1000)) {
    return json({ error: "Слишком много попыток. Попробуйте через 15 минут." }, 429);
  }
  const ip = clientIp(req.headers);
  const keys = [`creator-email:${parsed.data.email}`, `creator-ip:${ip}`];
  try {
    if ((await tooManyFailures(keys[0], 8, 15)) || (await tooManyFailures(keys[1], 30, 15))) {
      return json({ error: "Слишком много неудачных попыток. Попробуйте через 15 минут." }, 429);
    }
    const acc = await findAccountByEmail(parsed.data.email);
    if (!acc || !verifyPassword(parsed.data.password, acc.password_hash)) {
      await Promise.all(keys.map(recordFailure));
      return json({ error: "Неверный email или пароль" }, 401);
    }
    await setCreatorSession(acc.creator_id, acc.password_hash);
    await touchLogin(acc.creator_id);
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/creator/login");
  }
}
