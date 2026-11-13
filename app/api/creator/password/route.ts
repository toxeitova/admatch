import { z } from "zod";
import { json, readJson, serverError } from "@/lib/api";
import { hashPassword, setCreatorSession, verifyPassword } from "@/lib/auth";
import { getPasswordHash, setPasswordHash } from "@/lib/creatorData";
import { getCreatorId } from "@/lib/creatorSession";
import { recordFailure, tooManyFailures } from "@/lib/throttle";

const schema = z.object({ current: z.string().min(1).max(100), next: z.string().min(8, "Новый пароль: минимум 8 символов").max(100) });

export async function POST(req: Request) {
  const creatorId = await getCreatorId();
  if (!creatorId) return json({ error: "auth" }, 401);
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "validation" }, 400);
  try {
    if (await tooManyFailures(`pwchange:${creatorId}`, 5, 15)) return json({ error: "Слишком много попыток. Попробуйте через 15 минут." }, 429);
    const hash = await getPasswordHash(creatorId);
    if (!hash || !verifyPassword(parsed.data.current, hash)) {
      await recordFailure(`pwchange:${creatorId}`);
      return json({ error: "Текущий пароль неверный" }, 401);
    }
    const next = hashPassword(parsed.data.next);
    await setPasswordHash(creatorId, next);
    await setCreatorSession(creatorId, next); // остальные устройства выйдут из кабинета
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/creator/password");
  }
}
