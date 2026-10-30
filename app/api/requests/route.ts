import { after } from "next/server";
import { copy } from "@/lib/copy.ru";
import { createRequestWithMatches } from "@/lib/data";
import { json, readJson, serverError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { newRequestMessage, sendTelegram } from "@/lib/telegram";
import { fieldErrors, requestSchema } from "@/lib/validation";

const LIMIT_PER_HOUR = 10;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: copy.errors.server }, 400);
  }

  // honeypot: боты заполняют скрытое поле — отвечаем 200 и ничего не сохраняем
  if (body && typeof body === "object" && "website" in body && String((body as { website: unknown }).website ?? "").trim()) {
    return json({ requestId: null });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation", fields: fieldErrors(parsed.error) }, 400);

  if (!rateLimit(`req:${clientIp(req.headers)}`, LIMIT_PER_HOUR, 60 * 60 * 1000)) {
    return json({ error: copy.form.tooMany }, 429);
  }

  try {
    const input = parsed.data;
    const { id, found } = await createRequestWithMatches(input);
    // уведомление после ответа: не задерживает пользователя и не ломает ответ при ошибке
    after(() =>
      sendTelegram(
        newRequestMessage({
          id,
          product: input.product,
          niches: input.niches,
          budget_min: input.budget_min,
          budget_max: input.budget_max,
          contact: input.contact,
          found,
        }),
      ),
    );
    return json({ requestId: id });
  } catch (e) {
    return serverError(e, "POST /api/requests");
  }
}
