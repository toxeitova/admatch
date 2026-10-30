import { describe, expect, it } from "vitest";
import {
  buildWhyFits,
  failedFilter,
  isLiked,
  parseLikedHandles,
  minPrice,
  rankCreators,
  scoreCreator,
} from "@/lib/matching";
import type { Creator, MatchRequest } from "@/lib/types";

const NOW = new Date("2026-10-20T12:00:00Z");
const S = " ";

function creator(over: Partial<Creator> = {}): Creator {
  return {
    id: over.handle ?? "c1",
    handle: "blogger",
    display_name: null,
    avatar_url: null,
    instagram_url: null,
    tiktok_url: null,
    city: "Алматы",
    niches: ["Еда и рестораны"],
    followers: 10000,
    almaty_share_pct: 70,
    avg_reels_views: null,
    stories_reach: null,
    er_pct: 6.1,
    audience_age_from: 18,
    audience_age_to: 35,
    audience_gender: "f",
    price_reels: 45000,
    price_stories: null,
    price_post: null,
    price_tiktok: null,
    production_included: false,
    past_ad_url: null,
    why_fits_text: null,
    contact: "+7 700 000 00 00",
    verified: true,
    data_source: null,
    data_checked_at: null,
    consent: true,
    active: true,
    last_post_at: "2026-10-15",
    is_test: false,
    ...over,
  };
}

function request(over: Partial<MatchRequest> = {}): MatchRequest {
  return {
    city: "Алматы",
    niches: ["Еда и рестораны"],
    age_from: 18,
    age_to: 35,
    gender: "f",
    budget_min: 30000,
    budget_max: 80000,
    formats: [],
    ...over,
  };
}

const opts = { now: NOW, showTest: false };

describe("обязательные фильтры", () => {
  it("пропускает подходящего блогера", () => {
    expect(failedFilter(creator(), request(), opts)).toBeNull();
  });

  it.each([
    ["active", { active: false }],
    ["consent", { consent: false }],
    ["verified", { verified: false }],
    ["verified=null", { verified: null }],
  ])("1. отсекает при %s", (_, over) => {
    expect(failedFilter(creator(over as Partial<Creator>), request(), opts)).toBe("flags");
  });

  it("тестовые записи — только при showTest", () => {
    expect(failedFilter(creator({ is_test: true }), request(), opts)).toBe("test");
    expect(failedFilter(creator({ is_test: true }), request(), { ...opts, showTest: true })).toBeNull();
  });

  it("2. город должен совпадать", () => {
    expect(failedFilter(creator({ city: "Астана" }), request(), opts)).toBe("city");
  });

  it("3. нужна хотя бы одна общая ниша", () => {
    expect(failedFilter(creator({ niches: ["Авто"] }), request(), opts)).toBe("niche");
    expect(failedFilter(creator({ niches: ["Авто", "Еда и рестораны"] }), request(), opts)).toBeNull();
  });

  describe("4. бюджет", () => {
    it("минимальная цена ≤ budget_max × 1.2 — проходит (граница включительно)", () => {
      expect(failedFilter(creator({ price_reels: 96000 }), request(), opts)).toBeNull();
      expect(failedFilter(creator({ price_reels: 96001 }), request(), opts)).toBe("budget");
    });

    it("без выбранных форматов берётся минимум по всем непустым ценам", () => {
      const c = creator({ price_reels: 200000, price_stories: 20000 });
      expect(minPrice(c, [])).toEqual({ format: "stories", price: 20000 });
      expect(failedFilter(c, request(), opts)).toBeNull();
    });

    it("с выбранными форматами учитываются только они", () => {
      const c = creator({ price_reels: 200000, price_stories: 20000 });
      expect(failedFilter(c, request({ formats: ["reels"] }), opts)).toBe("budget");
      expect(failedFilter(c, request({ formats: ["reels", "stories"] }), opts)).toBeNull();
    });

    it("не проходит, если блогер не делает ни один выбранный формат или цен нет", () => {
      expect(failedFilter(creator(), request({ formats: ["tiktok"] }), opts)).toBe("budget");
      expect(failedFilter(creator({ price_reels: null }), request(), opts)).toBe("budget");
    });
  });

  describe("5. активность", () => {
    it("последний пост не старше 30 дней (30 — ещё можно)", () => {
      expect(failedFilter(creator({ last_post_at: "2026-09-20" }), request(), opts)).toBeNull();
      expect(failedFilter(creator({ last_post_at: "2026-09-19" }), request(), opts)).toBe("last_post");
    });

    it("null допускается", () => {
      expect(failedFilter(creator({ last_post_at: null }), request(), opts)).toBeNull();
    });
  });
});

describe("баллы", () => {
  const zero: Partial<Creator> = {
    almaty_share_pct: null,
    er_pct: null,
    audience_age_from: null,
    audience_age_to: null,
    audience_gender: "m",
  };

  it("ниша: 40 × совпавшие / ниши в заявке", () => {
    const req = request({ niches: ["Еда и рестораны", "Лайфстайл", "Авто"] });
    expect(scoreCreator(creator(zero), req).niche).toBeCloseTo(40 / 3);
    const two = creator({ ...zero, niches: ["Еда и рестораны", "Лайфстайл"] });
    expect(scoreCreator(two, req).niche).toBeCloseTo(80 / 3);
    expect(scoreCreator(creator(zero), request()).niche).toBe(40);
  });

  describe("аудитория", () => {
    it("+10 при пересечении возраста, включая касание границ", () => {
      expect(scoreCreator(creator({ audience_age_from: 35, audience_age_to: 45 }), request()).age).toBe(10);
      expect(scoreCreator(creator({ audience_age_from: 36, audience_age_to: 45 }), request()).age).toBe(0);
      expect(scoreCreator(creator({ audience_age_from: null, audience_age_to: null }), request()).age).toBe(0);
    });

    it("+10 при совпадении пола; 'all' в заявке и 'mixed' у блогера — совпадение", () => {
      expect(scoreCreator(creator({ audience_gender: "f" }), request({ gender: "f" })).gender).toBe(10);
      expect(scoreCreator(creator({ audience_gender: "m" }), request({ gender: "f" })).gender).toBe(0);
      expect(scoreCreator(creator({ audience_gender: "m" }), request({ gender: "all" })).gender).toBe(10);
      expect(scoreCreator(creator({ audience_gender: "mixed" }), request({ gender: "m" })).gender).toBe(10);
      expect(scoreCreator(creator({ audience_gender: null }), request({ gender: "m" })).gender).toBe(0);
    });
  });

  describe("бюджет", () => {
    it("20 — внутри [min, max] включительно", () => {
      expect(scoreCreator(creator({ price_reels: 30000 }), request()).budget).toBe(20);
      expect(scoreCreator(creator({ price_reels: 80000 }), request()).budget).toBe(20);
    });

    it("10 — ниже min", () => {
      expect(scoreCreator(creator({ price_reels: 15000 }), request()).budget).toBe(10);
    });

    it("10 — выше max не больше чем на 20%", () => {
      expect(scoreCreator(creator({ price_reels: 80001 }), request()).budget).toBe(10);
      expect(scoreCreator(creator({ price_reels: 96000 }), request()).budget).toBe(10);
    });

    it("считается по минимальной цене выбранных форматов", () => {
      const c = creator({ price_reels: 90000, price_stories: 40000 });
      expect(scoreCreator(c, request({ formats: ["reels"] })).budget).toBe(10);
      expect(scoreCreator(c, request({ formats: ["reels", "stories"] })).budget).toBe(20);
    });
  });

  it("Алматы: round(10 × доля / 100), null = 0", () => {
    expect(scoreCreator(creator({ almaty_share_pct: 72 }), request()).almaty).toBe(7);
    expect(scoreCreator(creator({ almaty_share_pct: 75 }), request()).almaty).toBe(8);
    expect(scoreCreator(creator({ almaty_share_pct: 100 }), request()).almaty).toBe(10);
    expect(scoreCreator(creator({ almaty_share_pct: null }), request()).almaty).toBe(0);
  });

  it("вовлечённость: 10 при ≥5, 5 при 2–5, иначе 0", () => {
    expect(scoreCreator(creator({ er_pct: 5 }), request()).er).toBe(10);
    expect(scoreCreator(creator({ er_pct: 4.9 }), request()).er).toBe(5);
    expect(scoreCreator(creator({ er_pct: 2 }), request()).er).toBe(5);
    expect(scoreCreator(creator({ er_pct: 1.9 }), request()).er).toBe(0);
    expect(scoreCreator(creator({ er_pct: null }), request()).er).toBe(0);
  });

  it("идеальный блогер набирает 100, итог округляется", () => {
    const perfect = creator({ almaty_share_pct: 100, er_pct: 7 });
    expect(scoreCreator(perfect, request()).total).toBe(100);
    const third = scoreCreator(creator(zero), request({ niches: ["Еда и рестораны", "Авто", "Лайфстайл"] }));
    // 13.33 (ниша) + 20 (бюджет) = 33.33 → 33
    expect(third.total).toBe(33);
  });
});

describe("сортировка и топ-10", () => {
  it("score по убыванию, затем доля Алматы по убыванию", () => {
    const list = [
      creator({ id: "a", handle: "a", er_pct: 1 }), // ниже score
      creator({ id: "b", handle: "b", almaty_share_pct: 70 }),
      creator({ id: "c", handle: "c", almaty_share_pct: 74 }), // тот же score (round 7), больше Алматы
    ];
    const ranked = rankCreators(request(), list, opts);
    expect(ranked.map((r) => r.creator.handle)).toEqual(["c", "b", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(ranked[0].score).toBe(ranked[1].score);
  });

  it("исключает не прошедших фильтры и берёт не больше 10", () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      creator({ id: `c${i}`, handle: `h${String(i).padStart(2, "0")}`, almaty_share_pct: 50 + i }),
    );
    many.push(creator({ id: "bad", handle: "bad", verified: false, almaty_share_pct: 100 }));
    const ranked = rankCreators(request(), many, opts);
    expect(ranked).toHaveLength(10);
    expect(ranked.find((r) => r.creator.handle === "bad")).toBeUndefined();
    expect(ranked[0].creator.handle).toBe("h13");
  });

  it("пустой результат, если никто не подошёл", () => {
    expect(rankCreators(request({ niches: ["Авто"] }), [creator()], opts)).toEqual([]);
  });
});

describe("текст «Почему подходит»", () => {
  it("использует why_fits_text, если он заполнен", () => {
    const c = creator({ why_fits_text: "  Снимает уютные обзоры кофеен  " });
    expect(buildWhyFits(c, request())).toBe("Снимает уютные обзоры кофеен");
  });

  it("собирает шаблон по сработавшим критериям через « · »", () => {
    const c = creator({ almaty_share_pct: 72, er_pct: 6.1, audience_gender: "m" });
    expect(buildWhyFits(c, request())).toBe(
      `Ниша: Еда и рестораны · 72% аудитории из Алматы · Reels 45${S}000${S}₸ — в вашем бюджете · Вовлечённость 6,1%`,
    );
  });

  it("пропускает несработавшие критерии и показывает аудиторию при совпадении", () => {
    const c = creator({
      niches: ["Еда и рестораны", "Лайфстайл"],
      almaty_share_pct: null,
      er_pct: 1.5,
      price_reels: 20000,
    });
    expect(buildWhyFits(c, request({ niches: ["Еда и рестораны", "Лайфстайл"] }))).toBe(
      `Ниши: Еда и рестораны, Лайфстайл · Reels 20${S}000${S}₸ — дешевле вашего бюджета · Аудитория вашего возраста и пола`,
    );
  });

  it("помечает цену чуть выше бюджета", () => {
    const c = creator({ price_reels: 90000, audience_gender: "m", er_pct: null, almaty_share_pct: null });
    expect(buildWhyFits(c, request())).toBe(`Ниша: Еда и рестораны · Reels 90${S}000${S}₸ — чуть выше бюджета`);
  });
});

describe("«Блогеры, которые вам нравятся»", () => {
  it("извлекает ники из @, ссылок и простых слов", () => {
    expect(
      parseLikedHandles(
        "Нравятся @Coffee_Dasha, https://www.instagram.com/almaty.foodie/ и tiktok.com/@funny_kz, ещё eat_with_arman. Бюджет 2026",
      ).sort(),
    ).toEqual(["almaty.foodie", "coffee_dasha", "eat_with_arman", "funny_kz"]);
    expect(parseLikedHandles("")).toEqual([]);
    expect(parseLikedHandles("нравятся весёлые и честные блогеры")).toEqual([]);
  });

  it("отмеченный блогер — первым, балл не меняется", () => {
    const list = [
      creator({ id: "top", handle: "top", almaty_share_pct: 100 }),
      creator({ id: "fav", handle: "fav", er_pct: 1, almaty_share_pct: 10 }),
    ];
    const plain = rankCreators(request(), list, opts);
    expect(plain.map((r) => r.creator.handle)).toEqual(["top", "fav"]);

    const req = request({ liked_handles: parseLikedHandles("очень нравится @Fav") });
    const ranked = rankCreators(req, list, opts);
    expect(ranked.map((r) => r.creator.handle)).toEqual(["fav", "top"]);
    expect(ranked[0].score).toBe(plain[1].score);
    expect(ranked[0].whyFits.startsWith("Вы отметили этого блогера · Ниша:")).toBe(true);
    expect(ranked[1].whyFits.startsWith("Вы отметили")).toBe(false);
  });

  it("узнаёт блогера по ссылке на Instagram/TikTok, даже если handle другой", () => {
    const c = creator({ handle: "dasha", tiktok_url: "https://www.tiktok.com/@dasha.coffee" });
    expect(isLiked(c, request({ liked_handles: parseLikedHandles("tiktok.com/@Dasha.Coffee") }))).toBe(true);
  });

  it("не обходит обязательные фильтры", () => {
    const expensive = creator({ id: "fav", handle: "fav", price_reels: 500000 });
    const req = request({ liked_handles: ["fav"] });
    expect(rankCreators(req, [expensive], opts)).toEqual([]);
  });

  it("попадает в топ-10, даже если по баллам был бы ниже", () => {
    const many = Array.from({ length: 12 }, (_, i) => creator({ id: `c${i}`, handle: `h${i}`, almaty_share_pct: 90 }));
    many.push(creator({ id: "fav", handle: "fav", er_pct: null, almaty_share_pct: null }));
    const ranked = rankCreators(request({ liked_handles: ["fav"] }), many, opts);
    expect(ranked).toHaveLength(10);
    expect(ranked[0].creator.handle).toBe("fav");
  });

  it("добавляет пометку и к why_fits_text", () => {
    const c = creator({ handle: "fav", why_fits_text: "Снимает кофейни" });
    expect(buildWhyFits(c, request({ liked_handles: ["fav"] }))).toBe("Вы отметили этого блогера · Снимает кофейни");
  });
});
