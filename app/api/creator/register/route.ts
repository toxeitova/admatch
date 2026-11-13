import { after } from "next/server";
import { json, readJson, serverError } from "@/lib/api";
import { hashPassword, setCreatorSession } from "@/lib/auth";
import { createCreatorAccount, findAccountByEmail, handleTaken } from "@/lib/creatorData";
import { registerSchema } from "@/lib/creatorValidation";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { creatorRegisteredMessage, sendTelegram } from "@/lib/telegram";
import { fieldErrors } from "@/lib/validation";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation", fields: fieldErrors(parsed.error) }, 400);
  if (!rateLimit(`creator-register:${clientIp(req.headers)}`, 10, 60 * 60 * 1000)) {
    return json({ error: "Слишком много попыток. Попробуйте через час." }, 429);
  }
  const d = parsed.data;
  try {
    if (await findAccountByEmail(d.email)) return json({ error: "validation", fields: { email: "Этот email уже зарегистрирован. Войдите." } }, 409);
    if (await handleTaken(d.handle)) return json({ error: "validation", fields: { handle: "Этот ник уже есть в AdMatch. Напишите нам в поддержку." } }, 409);
    const passwordHash = hashPassword(d.password);
    const creatorId = await createCreatorAccount({
      email: d.email,
      passwordHash,
      handle: d.handle,
      display_name: d.display_name,
      niches: d.niches,
      contact: d.contact,
      tiktok_url: d.tiktok_url,
    });
    await setCreatorSession(creatorId, passwordHash);
    after(() => sendTelegram(creatorRegisteredMessage({ handle: d.handle, name: d.display_name, niches: d.niches })));
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/creator/register");
  }
}
