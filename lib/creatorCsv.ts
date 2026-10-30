// Преобразование строки CSV (все значения — строки) в запись creators.
import { NICHES } from "./niches";

const INT_FIELDS = [
  "followers", "almaty_share_pct", "avg_reels_views", "stories_reach",
  "audience_age_from", "audience_age_to",
  "price_reels", "price_stories", "price_post", "price_tiktok",
] as const;
const BOOL_FIELDS = ["production_included", "verified", "consent", "active", "is_test"] as const;
const TEXT_FIELDS = [
  "display_name", "avatar_url", "instagram_url", "tiktok_url", "past_ad_url",
  "why_fits_text", "contact", "data_source",
] as const;
const DATE_FIELDS = ["data_checked_at", "last_post_at"] as const;
const BOOL_DEFAULTS: Record<(typeof BOOL_FIELDS)[number], boolean> = {
  production_included: false, verified: false, consent: false, active: true, is_test: false,
};

const empty = (v: string | undefined) => v === undefined || v.trim() === "";

function toInt(v: string | undefined, field: string): number | null {
  if (empty(v)) return null;
  const n = Number(v!.replace(/[\s ₸]/g, ""));
  if (!Number.isInteger(n)) throw new Error(`${field}: «${v}» — не целое число`);
  return n;
}

function toBool(v: string | undefined, field: string, fallback: boolean): boolean {
  if (empty(v)) return fallback;
  const s = v!.trim().toLowerCase();
  if (["true", "1", "yes", "да", "y"].includes(s)) return true;
  if (["false", "0", "no", "нет", "n"].includes(s)) return false;
  throw new Error(`${field}: «${v}» — ожидается true/false`);
}

function toDate(v: string | undefined, field: string): string | null {
  if (empty(v)) return null;
  const s = v!.trim();
  // принимаем YYYY-MM-DD и DD.MM.YYYY
  const ru = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const iso = ru ? `${ru[3]}-${ru[2]}-${ru[1]}` : s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso))) {
    throw new Error(`${field}: «${v}» — дата должна быть в формате ГГГГ-ММ-ДД`);
  }
  return iso;
}

export function parseCreatorRow(row: Record<string, string>) {
  const handle = (row.handle ?? "").trim().replace(/^@/, "");
  if (!handle) throw new Error("handle: пустое значение");

  const niches = (row.niches ?? "").split(";").map((s) => s.trim()).filter(Boolean);
  if (niches.length === 0) throw new Error("niches: нужна хотя бы одна ниша");
  const unknown = niches.filter((n) => !(NICHES as readonly string[]).includes(n));
  if (unknown.length) throw new Error(`niches: неизвестные ниши — ${unknown.join(", ")}`);

  const gender = empty(row.audience_gender) ? null : row.audience_gender.trim();
  if (gender !== null && !["f", "m", "mixed"].includes(gender)) {
    throw new Error(`audience_gender: «${gender}» — допустимо f, m, mixed`);
  }

  const out: Record<string, unknown> = {
    handle,
    city: empty(row.city) ? "Алматы" : row.city.trim(),
    niches,
    audience_gender: gender,
    er_pct: empty(row.er_pct) ? null : Number(row.er_pct.replace(",", ".")),
  };
  if (out.er_pct !== null && Number.isNaN(out.er_pct)) throw new Error(`er_pct: «${row.er_pct}» — не число`);

  for (const f of INT_FIELDS) out[f] = toInt(row[f], f);
  for (const f of BOOL_FIELDS) out[f] = toBool(row[f], f, BOOL_DEFAULTS[f]);
  for (const f of TEXT_FIELDS) out[f] = empty(row[f]) ? null : row[f].trim();
  for (const f of DATE_FIELDS) out[f] = toDate(row[f], f);

  const share = out.almaty_share_pct as number | null;
  if (share !== null && (share < 0 || share > 100)) throw new Error("almaty_share_pct: должно быть 0–100");
  return out;
}
