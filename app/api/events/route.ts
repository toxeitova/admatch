import { insertEvents } from "@/lib/data";
import { json, readJson, serverError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { eventPropsSchemas, eventSchema, eventsBatchSchema } from "@/lib/validation";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const batch = eventsBatchSchema.safeParse(body);
  if (!batch.success) return json({ error: "validation" }, 400);

  if (!rateLimit(`events:${clientIp(req.headers)}`, 300, 60 * 60 * 1000)) {
    return json({ error: "rate limited" }, 429);
  }

  // принимаем только 6 разрешённых событий с корректными props; остальные отбрасываем
  const rows = batch.data.flatMap((raw) => {
    const e = eventSchema.safeParse(raw);
    if (!e.success) return [];
    const props = eventPropsSchemas[e.data.name].safeParse(e.data.props);
    if (!props.success) return [];
    return [{ session_id: e.data.sessionId, request_id: e.data.requestId ?? null, name: e.data.name, props: props.data }];
  });

  if (!rows.length) return json({ ok: false, accepted: 0 }, 400);
  try {
    await insertEvents(rows);
    return json({ ok: true, accepted: rows.length });
  } catch (e) {
    return serverError(e, "POST /api/events");
  }
}
