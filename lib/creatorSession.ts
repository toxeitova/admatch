// Проверка входа блогера: подпись cookie + версия пароля из БД.
import "server-only";
import { passwordVersion, readCreatorCookie } from "./auth";
import { db } from "./supabase.server";

export async function getCreatorId(): Promise<string | null> {
  const c = await readCreatorCookie();
  if (!c?.cid || !c.pv) return null;
  const { data, error } = await db().from("creator_accounts").select("password_hash").eq("creator_id", c.cid).maybeSingle();
  if (error || !data) return null;
  return passwordVersion((data as { password_hash: string }).password_hash) === c.pv ? c.cid : null;
}
