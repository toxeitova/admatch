import { copy } from "@/lib/copy.ru";
import { getResults } from "@/lib/data";
import { json, serverError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const results = await getResults(id);
    if (!results) return json({ error: copy.errors.notFound }, 404);
    return json(results);
  } catch (e) {
    return serverError(e, "GET /api/requests/[id]");
  }
}
