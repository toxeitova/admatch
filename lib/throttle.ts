// Защита входа от перебора паролей. Счётчик неудачных попыток хранится в БД (таблица events),
// поэтому работает на всех серверах Vercel сразу, а не только в памяти одного.
import "server-only";
import { createHash } from "crypto";
import { db } from "./supabase.server";

const NAME = "auth_failed";
const hashKey = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 32);

export async function tooManyFailures(key: string, max: number, minutes: number): Promise<boolean> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count, error } = await db()
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("name", NAME)
    .eq("props->>k", hashKey(key))
    .gte("ts", since);
  if (error) {
    console.error("[throttle]", error);
    return false;
  }
  return (count ?? 0) >= max;
}

export async function recordFailure(key: string): Promise<void> {
  const { error } = await db().from("events").insert({ name: NAME, props: { k: hashKey(key) } });
  if (error) console.error("[throttle] record", error);
}
