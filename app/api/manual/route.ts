import { after } from "next/server";
import { copy } from "@/lib/copy.ru";
import { createManualRequest, getRequestForTeam } from "@/lib/data";
import { json, readJson, serverError } from "@/lib/api";
import { manualRequestMessage, sendTelegram } from "@/lib/telegram";
import { manualSchema } from "@/lib/validation";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: copy.errors.server }, 400);
  }
  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation" }, 400);

  const { requestId } = parsed.data;
  try {
    const request = await getRequestForTeam(requestId);
    if (!request) return json({ error: copy.errors.notFound }, 404);

    const { created, found } = await createManualRequest(requestId);
    if (created) {
      after(() =>
        sendTelegram(
          manualRequestMessage({ requestId, product: request.product, found, contact: request.contact, details: request }),
        ),
      );
    }
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/manual");
  }
}
