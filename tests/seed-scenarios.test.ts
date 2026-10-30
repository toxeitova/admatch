// 5 тестовых заявок на seed-данных: в каждой ≥3 блогера и никто не нарушает обязательные фильтры.
import { describe, expect, it } from "vitest";
import { testCreatorRows } from "@/data/test-creators";
import { failedFilter, rankCreators } from "@/lib/matching";
import type { MatchRequest } from "@/lib/types";

const NOW = new Date();
const creators = testCreatorRows(NOW).map((c, i) => ({ ...c, id: `seed-${i}` }));

const scenarios: Array<[string, MatchRequest]> = [
  ["кофейня", { city: "Алматы", niches: ["Еда и рестораны"], age_from: 18, age_to: 35, gender: "all", budget_min: 30000, budget_max: 80000, formats: [] }],
  ["салон красоты", { city: "Алматы", niches: ["Красота и уход"], age_from: 20, age_to: 40, gender: "f", budget_min: 20000, budget_max: 60000, formats: ["reels", "stories"] }],
  ["магазин одежды", { city: "Алматы", niches: ["Мода и одежда", "Лайфстайл"], age_from: 18, age_to: 30, gender: "f", budget_min: 50000, budget_max: 150000, formats: [] }],
  ["детский центр", { city: "Алматы", niches: ["Мамы и дети", "Образование", "Дом и интерьер"], age_from: 25, age_to: 40, gender: "f", budget_min: 15000, budget_max: 40000, formats: [] }],
  ["автосервис", { city: "Алматы", niches: ["Техника и гаджеты", "Авто"], age_from: 20, age_to: 45, gender: "m", budget_min: 100000, budget_max: 250000, formats: ["reels", "tiktok"] }],
];

describe("seed: 15 тестовых блогеров", () => {
  it("все с is_test и префиксом test_, цены 15 000–250 000 ₸", () => {
    expect(creators).toHaveLength(15);
    for (const c of creators) {
      expect(c.is_test).toBe(true);
      expect(c.handle.startsWith("test_")).toBe(true);
      for (const p of [c.price_reels, c.price_stories, c.price_post, c.price_tiktok]) {
        if (p != null) {
          expect(p).toBeGreaterThanOrEqual(15000);
          expect(p).toBeLessThanOrEqual(250000);
        }
      }
    }
  });

  it("без SHOW_TEST_DATA тестовые блогеры в подбор не попадают", () => {
    expect(rankCreators(scenarios[0][1], creators, { now: NOW, showTest: false })).toHaveLength(0);
  });
});

describe.each(scenarios)("заявка «%s»", (_, req) => {
  const ranked = rankCreators(req, creators, { now: NOW, showTest: true });

  it("находит не меньше 3 блогеров", () => {
    expect(ranked.length).toBeGreaterThanOrEqual(3);
  });

  it("все проходят обязательные фильтры и отсортированы", () => {
    for (const r of ranked) expect(failedFilter(r.creator, req, { now: NOW, showTest: true })).toBeNull();
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
  });
});
