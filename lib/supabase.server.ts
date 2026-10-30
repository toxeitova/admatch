import "server-only";
import { PostgrestClient } from "@supabase/postgrest-js";
import { createDbClient } from "./db-client";

let client: PostgrestClient | null = null;

/** Клиент с service_role: обходит RLS. Только для серверного кода. */
export function db(): PostgrestClient {
  client ??= createDbClient();
  return client;
}
