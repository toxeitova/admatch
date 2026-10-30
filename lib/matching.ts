// Подбор блогеров под заявку: обязательные фильтры → баллы → сортировка → топ-N.
// Чистые функции без доступа к БД, чтобы их можно было покрыть unit-тестами.
import { MATCHING_CONFIG as CFG } from "./matching.config";
import { formatPct, formatPrice } from "./format";
import type { Format } from "./niches";
import type { Creator, MatchRequest, RankedCreator } from "./types";

type ScorableCreator = Omit<Creator, "id" | "contact" | "data_source" | "data_checked_at"> & { id?: string };

export const FORMAT_LABELS: Record<Format, string> = {
  reels: "Reels",
  stories: "Stories",
  post: "Пост",
  tiktok: "TikTok",
};

const PRICE_FIELD = {
  reels: "price_reels",
  stories: "price_stories",
  post: "price_post",
  tiktok: "price_tiktok",
} as const satisfies Record<Format, keyof Creator>;

const ALL_FORMATS = Object.keys(PRICE_FIELD) as Format[];

export interface FormatPrice {
  format: Format;
  price: number;
}

/** Цены по выбранным форматам (если не выбраны — по всем), только непустые. */
export function relevantPrices(creator: ScorableCreator, formats: Format[]): FormatPrice[] {
  const list = formats.length ? formats : ALL_FORMATS;
  return list
    .map((format) => ({ format, price: creator[PRICE_FIELD[format]] }))
    .filter((p): p is FormatPrice => typeof p.price === "number");
}

/** Минимальная цена по релевантным форматам или null, если блогер их не делает. */
export function minPrice(creator: ScorableCreator, formats: Format[]): FormatPrice | null {
  const prices = relevantPrices(creator, formats);
  if (!prices.length) return null;
  return prices.reduce((min, p) => (p.price < min.price ? p : min));
}

export function matchedNiches(creator: ScorableCreator, req: MatchRequest): string[] {
  return req.niches.filter((n) => creator.niches.includes(n));
}

function daysBetween(isoDate: string, now: Date): number {
  const then = Date.parse(isoDate.slice(0, 10) + "T00:00:00Z");
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - then) / 86_400_000);
}

export type FilterName = "flags" | "test" | "city" | "niche" | "budget" | "last_post";

export interface MatchOptions {
  now?: Date;
  /** SHOW_TEST_DATA === 'true' */
  showTest?: boolean;
}

/** Возвращает первый непройденный обязательный фильтр или null, если блогер проходит все. */
export function failedFilter(creator: ScorableCreator, req: MatchRequest, opts: MatchOptions = {}): FilterName | null {
  const now = opts.now ?? new Date();
  if (creator.active !== true || creator.consent !== true || creator.verified !== true) return "flags";
  if (creator.is_test && !opts.showTest) return "test";
  if (creator.city !== req.city) return "city";
  if (matchedNiches(creator, req).length === 0) return "niche";
  const min = minPrice(creator, req.formats);
  if (!min || min.price > req.budget_max * (1 + CFG.budgetTolerance)) return "budget";
  if (creator.last_post_at && daysBetween(creator.last_post_at, now) > CFG.maxDaysSinceLastPost) return "last_post";
  return null;
}

export function passesFilters(creator: ScorableCreator, req: MatchRequest, opts: MatchOptions = {}): boolean {
  return failedFilter(creator, req, opts) === null;
}

export interface ScoreBreakdown {
  niche: number;
  age: number;
  gender: number;
  budget: number;
  almaty: number;
  er: number;
  total: number;
}

export function ageOverlaps(creator: ScorableCreator, req: MatchRequest): boolean {
  const { audience_age_from: from, audience_age_to: to } = creator;
  if (from == null || to == null) return false;
  return from <= req.age_to && to >= req.age_from;
}

export function genderMatches(creator: ScorableCreator, req: MatchRequest): boolean {
  if (req.gender === "all" || creator.audience_gender === "mixed") return true;
  return creator.audience_gender === req.gender;
}

export function budgetPoints(price: number | null, req: MatchRequest): number {
  if (price == null) return 0;
  if (price >= req.budget_min && price <= req.budget_max) return CFG.weights.budgetInside;
  if (price < req.budget_min) return CFG.weights.budgetNear;
  if (price <= req.budget_max * (1 + CFG.budgetTolerance)) return CFG.weights.budgetNear;
  return 0;
}

export function erPoints(er: number | null): number {
  if (er == null) return 0;
  if (er >= CFG.erHighFrom) return CFG.weights.erHigh;
  if (er >= CFG.erMidFrom) return CFG.weights.erMid;
  return 0;
}

export function scoreCreator(creator: ScorableCreator, req: MatchRequest): ScoreBreakdown {
  const niche = req.niches.length
    ? (CFG.weights.niche * matchedNiches(creator, req).length) / req.niches.length
    : 0;
  const age = ageOverlaps(creator, req) ? CFG.weights.ageOverlap : 0;
  const gender = genderMatches(creator, req) ? CFG.weights.gender : 0;
  const budget = budgetPoints(minPrice(creator, req.formats)?.price ?? null, req);
  const almaty = creator.almaty_share_pct == null ? 0 : Math.round((CFG.weights.almaty * creator.almaty_share_pct) / 100);
  const er = erPoints(creator.er_pct == null ? null : Number(creator.er_pct));
  const total = Math.min(100, Math.round(niche + age + gender + budget + almaty + er));
  return { niche, age, gender, budget, almaty, er, total };
}

// ─── «Блогеры, которые вам нравятся» ───────────────────────────────────────
const LIKED_URL = /(?:instagram\.com|tiktok\.com)\/@?([a-z0-9._]+)/gi;
const LIKED_TOKEN = /@?([a-z0-9._]+)/gi;

const normHandle = (h: string) => h.toLowerCase().replace(/^@/, "").replace(/^\.+|\.+$/g, "");

/** Извлекает ники из свободного текста: @nick, instagram.com/nick, tiktok.com/@nick, просто nick. */
export function parseLikedHandles(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const m of text.matchAll(LIKED_URL)) found.add(normHandle(m[1]));
  const withoutUrls = text.replace(/\S*(?:instagram\.com|tiktok\.com|https?:)\S*/gi, " ");
  for (const m of withoutUrls.matchAll(LIKED_TOKEN)) {
    const h = normHandle(m[1]);
    // ник: от 3 символов и хотя бы одна латинская буква (отсекаем числа вроде «2026»)
    if (h.length >= 3 && /[a-z]/.test(h)) found.add(h);
  }
  return [...found].slice(0, 50);
}

function handleFromUrl(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:instagram\.com|tiktok\.com)\/@?([a-z0-9._]+)/i);
  return m ? normHandle(m[1]) : null;
}

/** Отметил ли клиент этого блогера в поле «Блогеры, которые вам нравятся». */
export function isLiked(creator: ScorableCreator, req: MatchRequest): boolean {
  if (!req.liked_handles?.length) return false;
  const own = [creator.handle, handleFromUrl(creator.instagram_url), handleFromUrl(creator.tiktok_url)]
    .filter((h): h is string => !!h)
    .map(normHandle);
  return own.some((h) => req.liked_handles!.includes(h));
}

/** Текст «Почему подходит»: why_fits_text или сборка из сработавших критериев. */
export function buildWhyFits(creator: ScorableCreator, req: MatchRequest): string {
  const liked = isLiked(creator, req) ? `${CFG.likedLabel} · ` : "";
  if (creator.why_fits_text?.trim()) return liked + creator.why_fits_text.trim();

  const parts: string[] = [];
  const niches = matchedNiches(creator, req);
  if (niches.length) parts.push(`${niches.length > 1 ? "Ниши" : "Ниша"}: ${niches.join(", ")}`);

  if (creator.almaty_share_pct) parts.push(`${creator.almaty_share_pct}% аудитории из Алматы`);

  const min = minPrice(creator, req.formats);
  if (min) {
    const label = `${FORMAT_LABELS[min.format]} ${formatPrice(min.price)}`;
    if (min.price >= req.budget_min && min.price <= req.budget_max) parts.push(`${label} — в вашем бюджете`);
    else if (min.price < req.budget_min) parts.push(`${label} — дешевле вашего бюджета`);
    else if (budgetPoints(min.price, req) > 0) parts.push(`${label} — чуть выше бюджета`);
  }

  if (ageOverlaps(creator, req) && genderMatches(creator, req)) parts.push("Аудитория вашего возраста и пола");

  const er = creator.er_pct == null ? null : Number(creator.er_pct);
  if (er != null && erPoints(er) > 0) parts.push(`Вовлечённость ${formatPct(er)}`);

  return liked + parts.join(" · ");
}

/**
 * Сортировка: отмеченные клиентом блогеры — первыми, затем score ↓,
 * доля Алматы ↓ (null — в конце), handle для стабильности.
 */
export function compareRanked(
  a: { score: number; creator: ScorableCreator; liked?: boolean },
  b: { score: number; creator: ScorableCreator; liked?: boolean },
): number {
  if (!!a.liked !== !!b.liked) return a.liked ? -1 : 1;
  if (b.score !== a.score) return b.score - a.score;
  const sa = a.creator.almaty_share_pct ?? -1;
  const sb = b.creator.almaty_share_pct ?? -1;
  if (sb !== sa) return sb - sa;
  return a.creator.handle.localeCompare(b.creator.handle);
}

export function rankCreators<C extends ScorableCreator>(
  req: MatchRequest,
  creators: C[],
  opts: MatchOptions = {},
): RankedCreator<C>[] {
  return creators
    .filter((c) => passesFilters(c, req, opts))
    .map((creator) => ({ creator, score: scoreCreator(creator, req).total, liked: isLiked(creator, req) }))
    .sort(compareRanked)
    .slice(0, CFG.topN)
    .map(({ creator, score }, i) => ({ creator, score, rank: i + 1, whyFits: buildWhyFits(creator, req) }));
}
