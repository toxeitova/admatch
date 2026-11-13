import { describe, expect, it } from "vitest";
import { formatAvailability } from "@/lib/availability";
import { handleSchema, legacyPrices, pricesSchema, registerSchema } from "@/lib/creatorValidation";

describe("свободные даты", () => {
  it("склеивает подряд идущие дни", () => {
    const days = ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-29", "2026-11-30"];
    expect(formatAvailability(days)).toEqual(["6–10, 15–20, 29, 30 ноября"]);
  });
  it("разные месяцы — разные строки", () => {
    expect(formatAvailability(["2026-12-01", "2026-11-30"])).toEqual(["30 ноября", "1 декабря"]);
  });
  it("пусто", () => expect(formatAvailability([])).toEqual([]));
});

describe("цены блогера", () => {
  it("старые поля подбора = минимальная цена формата", () => {
    expect(legacyPrices({ price_reels_15: 40000, price_reels_60: 60000, price_post_photo: null, price_post_carousel: 30000, price_story_one: 10000, price_story_series: 25000 }))
      .toEqual({ price_reels: 40000, price_post: 30000, price_stories: 10000 });
  });
  it("нужна хотя бы одна цена", () => {
    const empty = { price_reels_15: null, price_reels_60: null, price_post_photo: null, price_post_carousel: null, price_story_one: null, price_story_series: null, production_included: false };
    expect(pricesSchema.safeParse(empty).success).toBe(false);
    expect(pricesSchema.safeParse({ ...empty, price_story_one: 5000 }).success).toBe(true);
  });
});

describe("регистрация", () => {
  it("ник чистится от @ и ссылки", () => {
    expect(handleSchema.parse("@Almaty_Foodie")).toBe("almaty_foodie");
    expect(handleSchema.parse("https://instagram.com/coffee.dasha/")).toBe("coffee.dasha");
    expect(handleSchema.safeParse("плохой ник").success).toBe(false);
  });
  it("нужно согласие и пароль от 8 символов", () => {
    const ok = { email: "a@b.kz", password: "12345678", handle: "test_x", display_name: "Аня", niches: ["Еда и рестораны"], contact: "@anya_x", consent: true };
    expect(registerSchema.safeParse(ok).success).toBe(true);
    expect(registerSchema.safeParse({ ...ok, consent: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, password: "123" }).success).toBe(false);
  });
});

import { isRealImage } from "@/lib/creatorValidation";
import { safeHttpUrl } from "@/lib/url";

describe("защита", () => {
  it("ссылки javascript: не проходят", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://tiktok.com/@x")).toBe("https://tiktok.com/@x");
  });
  it("файл должен быть настоящей картинкой", () => {
    const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64");
    const fake = "data:image/png;base64," + Buffer.from("<script>alert(1)</script>").toString("base64");
    expect(isRealImage(png)).toBe(true);
    expect(isRealImage(fake)).toBe(false);
  });
  it("TikTok только как ссылка на профиль", () => {
    const ok = { email: "a@b.kz", password: "12345678", handle: "test_x", display_name: "Аня", niches: ["Еда и рестораны"], contact: "@anya_x", consent: true };
    expect(registerSchema.safeParse({ ...ok, tiktok_url: "javascript:alert(1)" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, tiktok_url: "https://tiktok.com/@anya_x" }).success).toBe(true);
  });
});
