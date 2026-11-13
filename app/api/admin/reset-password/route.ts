import { randomBytes } from "crypto";
import { z } from "zod";
import { json, readJson, serverError } from "@/lib/api";
import { hashPassword, isAdmin } from "@/lib/auth";
import { setPasswordHash } from "@/lib/creatorData";

const schema = z.object({ creatorId: z.string().uuid() });

/** Админ выдаёт блогеру временный пароль (если тот забыл свой). Пароль показывается один раз. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return json({ error: "auth" }, 401);
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: "validation" }, 400);
  try {
    const temp = randomBytes(9).toString("base64url");
    await setPasswordHash(parsed.data.creatorId, hashPassword(temp));
    return json({ ok: true, password: temp });
  } catch (e) {
    return serverError(e, "POST /api/admin/reset-password");
  }
}
