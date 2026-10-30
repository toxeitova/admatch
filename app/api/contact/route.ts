import { after } from "next/server";
import { copy } from "@/lib/copy.ru";
import { getMatchedCreator, getRequestForTeam, insertContactRequest } from "@/lib/data";
import { json, readJson, serverError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { admatchDealMessage, directContactMessage, sendTelegram } from "@/lib/telegram";
import { contactSchema } from "@/lib/validation";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: copy.errors.server }, 400);
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation" }, 400);

  if (!rateLimit(`contact:${clientIp(req.headers)}`, 60, 60 * 60 * 1000)) {
    return json({ error: copy.form.tooMany }, 429);
  }

  const { requestId, creatorId, choice } = parsed.data;
  try {
    // контакт выдаём только по блогеру из подборки этой заявки
    const [request, creator] = await Promise.all([
      getRequestForTeam(requestId),
      getMatchedCreator(requestId, creatorId),
    ]);
    if (!request || !creator) return json({ error: copy.errors.notFound }, 404);

    await insertContactRequest(requestId, creatorId, choice);

    after(() =>
      sendTelegram(
        choice === "admatch"
          ? admatchDealMessage({
              requestId,
              product: request.product,
              handle: creator.handle,
              contact: request.contact,
              details: request,
            })
          : directContactMessage({ product: request.product, handle: creator.handle }),
      ),
    );

    if (choice === "direct") return json({ ok: true, contact: creator.contact ?? "" });
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/contact");
  }
}
