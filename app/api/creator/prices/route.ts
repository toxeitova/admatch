import { after } from "next/server";
import { json, readJson, serverError } from "@/lib/api";
import { getCreatorId } from "@/lib/creatorSession";
import { getProfile, updatePrices } from "@/lib/creatorData";
import { PRICE_KEYS, PRICE_LABELS, pricesSchema } from "@/lib/creatorValidation";
import { formatPrice } from "@/lib/format";
import { pricesChangedMessage, sendTelegram } from "@/lib/telegram";

export async function POST(req: Request) {
  const creatorId = await getCreatorId();
  if (!creatorId) return json({ error: "auth" }, 401);
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = pricesSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "validation" }, 400);
  try {
    await updatePrices(creatorId, parsed.data);
    const prof = await getProfile(creatorId);
    if (prof?.verified) {
      const lines = PRICE_KEYS.filter((k) => parsed.data[k]).map((k) => `${PRICE_LABELS[k]}: ${formatPrice(parsed.data[k]!)}`);
      after(() => sendTelegram(pricesChangedMessage({ handle: prof.handle, lines })));
    }
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/creator/prices");
  }
}
