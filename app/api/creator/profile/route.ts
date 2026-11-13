import { json, readJson, serverError } from "@/lib/api";
import { getCreatorId } from "@/lib/creatorSession";
import { updateProfile } from "@/lib/creatorData";
import { profileSchema } from "@/lib/creatorValidation";
import { fieldErrors } from "@/lib/validation";

export async function POST(req: Request) {
  const creatorId = await getCreatorId();
  if (!creatorId) return json({ error: "auth" }, 401);
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation", fields: fieldErrors(parsed.error) }, 400);
  try {
    await updateProfile(creatorId, parsed.data);
    return json({ ok: true });
  } catch (e) {
    return serverError(e, "POST /api/creator/profile");
  }
}
