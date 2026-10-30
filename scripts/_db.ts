import { config } from "dotenv";
import { createDbClient } from "../lib/db-client";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export function adminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local");
    process.exit(1);
  }
  return createDbClient();
}
