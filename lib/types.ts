import type { Format } from "./niches";

export type AudienceGender = "f" | "m" | "mixed";

export interface Creator {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  city: string;
  niches: string[];
  followers: number | null;
  almaty_share_pct: number | null;
  avg_reels_views: number | null;
  stories_reach: number | null;
  er_pct: number | null;
  audience_age_from: number | null;
  audience_age_to: number | null;
  audience_gender: AudienceGender | null;
  price_reels: number | null;
  price_stories: number | null;
  price_post: number | null;
  price_tiktok: number | null;
  production_included: boolean | null;
  past_ad_url: string | null;
  why_fits_text: string | null;
  contact: string | null;
  verified: boolean | null;
  data_source: string | null;
  data_checked_at: string | null;
  consent: boolean | null;
  active: boolean | null;
  last_post_at: string | null;
  is_test: boolean | null;
  created_at?: string;
}

/** Блогер в публичных ответах API: без contact и служебных полей. */
export type PublicCreator = Omit<Creator, "contact" | "consent" | "data_source" | "is_test" | "created_at">;

/** Поля заявки, которые нужны подбору. */
export interface MatchRequest {
  city: string;
  niches: string[];
  age_from: number;
  age_to: number;
  gender: "f" | "m" | "all";
  budget_min: number;
  budget_max: number;
  formats: Format[];
  /** Ники из поля «Блогеры, которые вам нравятся» (нижний регистр, без @). */
  liked_handles?: string[];
}

export interface RankedCreator<C = Creator> {
  creator: C;
  score: number;
  rank: number;
  whyFits: string;
}

/** Заявка в публичных ответах API (без contact). */
export interface PublicRequest extends MatchRequest {
  id: string;
  product: string;
  goal: "sales" | "followers" | "visits";
  deadline: string;
  created_at: string;
}

export interface PublicMatch {
  rank: number;
  score: number;
  whyFits: string;
  creator: PublicCreator;
}
