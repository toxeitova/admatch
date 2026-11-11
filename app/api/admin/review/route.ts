import { json, readJson, serverError } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { reviewSubmission } from "@/lib/creatorData";
import { reviewSchema } from "@/lib/creatorValidation";

export async function POST(req: Request) {
  if (!(await isAdmin())) return json({ error: "auth" }, 401);
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation" }, 400);
  try {
    const r = await reviewSubmission(parsed.data.submissionId, parsed.data.decision, parsed.data.note);
    if (!r) return json({ error: "Уже проверено" }, 409);
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/admin/review");
  }
}
