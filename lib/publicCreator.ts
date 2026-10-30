// Белый список полей блогера для публичных ответов. contact сюда не входит никогда.
import type { PublicCreator } from "./types";

export const PUBLIC_CREATOR_FIELDS = [
  "id",
  "handle",
  "display_name",
  "avatar_url",
  "instagram_url",
  "tiktok_url",
  "city",
  "niches",
  "followers",
  "almaty_share_pct",
  "avg_reels_views",
  "stories_reach",
  "er_pct",
  "audience_age_from",
  "audience_age_to",
  "audience_gender",
  "price_reels",
  "price_stories",
  "price_post",
  "price_tiktok",
  "production_included",
  "past_ad_url",
  "why_fits_text",
  "verified",
  "data_checked_at",
  "active",
  "last_post_at",
] as const satisfies readonly (keyof PublicCreator)[];

export const PUBLIC_CREATOR_COLUMNS = PUBLIC_CREATOR_FIELDS.join(",");

/** Копирует только разрешённые поля, даже если в row есть contact. */
export function toPublicCreator(row: Record<string, unknown>): PublicCreator {
  const out: Record<string, unknown> = {};
  for (const f of PUBLIC_CREATOR_FIELDS) out[f] = row[f] ?? null;
  if (out.er_pct != null) out.er_pct = Number(out.er_pct);
  return out as unknown as PublicCreator;
}

export const PUBLIC_REQUEST_COLUMNS =
  "id,product,city,niches,age_from,age_to,gender,goal,budget_min,budget_max,deadline,formats,created_at";
