import { after } from "next/server";
import { json, readJson, serverError } from "@/lib/api";
import { getCreatorId } from "@/lib/auth";
import { formatAvailability } from "@/lib/availability";
import { getProfile, setAvailability } from "@/lib/creatorData";
import { availabilitySchema } from "@/lib/creatorValidation";
import { availabilityChangedMessage, sendTelegram } from "@/lib/telegram";

export async function POST(req: Request) {
  const creatorId = await getCreatorId();
  if (!creatorId) return json({ error: "auth" }, 401);
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation" }, 400);
  try {
    const [before, now] = await setAvailability(creatorId, parsed.data.days);
    const prof = await getProfile(creatorId);
    if (prof && before.join() !== now.join()) {
      after(() =>
        sendTelegram(
          availabilityChangedMessage({ handle: prof.handle, before: formatAvailability(before), after: formatAvailability(now) }),
        ),
      );
    }
    return json({ ok: true, days: now });
  } catch (e) {
    return serverError(e, "POST /api/creator/availability");
  }
}
