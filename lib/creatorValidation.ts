// Схемы для кабинета блогера и админки (общие для клиента и сервера).
import { z } from "zod";
import { isValidContact } from "./contact";
import { NICHES } from "./niches";

const money = z.number().int().min(0).max(100_000_000).nullable();
const optInt = (max: number) => z.number().int().min(0).max(max).nullable().optional();

export const handleSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "").toLowerCase())
  .pipe(z.string().regex(/^[a-z0-9._]{2,30}$/, "Ник: латинские буквы, цифры, точка или _"));

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Проверьте email").max(120),
  password: z.string().min(8, "Пароль: минимум 8 символов").max(100),
  handle: handleSchema,
  display_name: z.string().trim().min(1, "Как вас зовут?").max(80),
  niches: z.array(z.enum(NICHES)).min(1, "Выберите от 1 до 3 ниш").max(3, "Выберите от 1 до 3 ниш"),
  contact: z.string().trim().min(1).max(100).refine(isValidContact, "Телефон или ник в Telegram"),
  tiktok_url: z.string().trim().max(200).optional().default(""),
  consent: z.literal(true, { errorMap: () => ({ message: "Нужно согласие" }) }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(100),
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  niches: z.array(z.enum(NICHES)).min(1).max(3),
  contact: z.string().trim().min(1).max(100).refine(isValidContact),
  tiktok_url: z.string().trim().max(200).optional().default(""),
});

export const PRICE_KEYS = [
  "price_reels_15",
  "price_reels_60",
  "price_post_photo",
  "price_post_carousel",
  "price_story_one",
  "price_story_series",
] as const;
export type PriceKey = (typeof PRICE_KEYS)[number];

export const PRICE_LABELS: Record<PriceKey, string> = {
  price_reels_15: "Reels до 15 сек",
  price_reels_60: "Reels до 1 мин",
  price_post_photo: "Пост, 1 фото",
  price_post_carousel: "Пост-карусель",
  price_story_one: "Сторис, 1 шт",
  price_story_series: "Серия сторис",
};

export const pricesSchema = z
  .object({
    price_reels_15: money,
    price_reels_60: money,
    price_post_photo: money,
    price_post_carousel: money,
    price_story_one: money,
    price_story_series: money,
    production_included: z.boolean(),
  })
  .refine((p) => PRICE_KEYS.some((k) => p[k] != null && p[k]! > 0), { message: "Укажите цену хотя бы одного формата" });

const screenshot = z
  .string()
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Неверный файл")
  .max(1_200_000, "Скриншот слишком большой");

export const statsSchema = z
  .object({
    followers: z.number().int().min(0).max(100_000_000),
    almaty_share_pct: z.number().int().min(0).max(100),
    avg_reels_views: optInt(100_000_000),
    stories_reach: optInt(100_000_000),
    er_pct: z.number().min(0).max(100).nullable().optional(),
    audience_age_from: optInt(80),
    audience_age_to: optInt(80),
    audience_gender: z.enum(["f", "m", "mixed"]).nullable().optional(),
    screenshots: z.array(screenshot).min(1, "Добавьте хотя бы 1 скриншот статистики").max(5, "Не больше 5 скриншотов"),
  })
  .refine((s) => s.audience_age_from == null || s.audience_age_to == null || s.audience_age_from <= s.audience_age_to, {
    message: "Возраст «от» больше «до»",
  });

export const availabilitySchema = z.object({
  days: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(200),
});

export const reviewSchema = z.object({
  submissionId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional().default(""),
});

/** Старые поля цен, по которым работает подбор, считаем из новых. */
export function legacyPrices(p: Partial<Record<PriceKey, number | null>>) {
  const min = (...v: (number | null | undefined)[]) => {
    const xs = v.filter((x): x is number => x != null && x > 0);
    return xs.length ? Math.min(...xs) : null;
  };
  return {
    price_reels: min(p.price_reels_15, p.price_reels_60),
    price_post: min(p.price_post_photo, p.price_post_carousel),
    price_stories: min(p.price_story_one, p.price_story_series),
  };
}
