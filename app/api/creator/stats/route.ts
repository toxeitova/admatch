import { after } from "next/server";
import { json, readJson, serverError } from "@/lib/api";
import { getCreatorId } from "@/lib/creatorSession";
import { createSubmission, getProfile, latestSubmission } from "@/lib/creatorData";
import { statsSchema } from "@/lib/creatorValidation";
import { sendTelegram, statsSubmittedMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  const creatorId = await getCreatorId();
  if (!creatorId) return json({ error: "auth" }, 401);
  let body: unknown;
  try {
    body = await readJson(req, 4_200_000);
  } catch {
    return json({ error: "Файлы слишком большие. Загрузите меньше скриншотов." }, 413);
  }
  const parsed = statsSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "validation" }, 400);
  try {
    const last = await latestSubmission(creatorId);
    if (last?.status === "pending") return json({ error: "Прошлая аналитика ещё на проверке. Дождитесь ответа." }, 409);
    const { screenshots, ...s } = parsed.data;
    await createSubmission(
      creatorId,
      {
        followers: s.followers,
        almaty_share_pct: s.almaty_share_pct,
        avg_reels_views: s.avg_reels_views ?? null,
        stories_reach: s.stories_reach ?? null,
        er_pct: s.er_pct ?? null,
        audience_age_from: s.audience_age_from ?? null,
        audience_age_to: s.audience_age_to ?? null,
        audience_gender: s.audience_gender ?? null,
      },
      screenshots,
    );
    const prof = await getProfile(creatorId);
    if (prof) {
      after(() => sendTelegram(statsSubmittedMessage({ handle: prof.handle, followers: s.followers, screenshots: screenshots.length })));
    }
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/creator/stats");
  }
}
