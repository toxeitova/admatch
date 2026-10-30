// REST-клиент Supabase (PostgREST) с service_role. Используем только его:
// realtime/auth/storage-клиенты из supabase-js MVP не нужны.
import { PostgrestClient } from "@supabase/postgrest-js";

export function createDbClient(): PostgrestClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY не заданы");
  // Новые ключи (sb_secret_…) не JWT — передаются только в apikey.
  // Legacy service_role (JWT, eyJ…) — ещё и в Authorization.
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  // принимаем и https://xxx.supabase.co, и https://xxx.supabase.co/rest/v1/
  const base = url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  return new PostgrestClient(`${base}/rest/v1`, { headers });
}
