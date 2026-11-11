import { isAdmin } from "@/lib/auth";
import { getScreenshot } from "@/lib/creatorData";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("auth", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("bad id", { status: 400 });
  const shot = await getScreenshot(id);
  if (!shot) return new Response("not found", { status: 404 });
  return new Response(Buffer.from(shot.data, "base64"), {
    headers: { "Content-Type": shot.mime, "Cache-Control": "private, max-age=3600" },
  });
}
