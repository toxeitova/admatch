import { describe, expect, it } from "vitest";
import { suggestNiches } from "@/lib/nicheSuggest";

describe("подсказка ниш (A9)", () => {
  it("кофейня → Еда и рестораны", () => expect(suggestNiches("Кофейня в центре, новое осеннее меню")[0]).toBe("Еда и рестораны"));
  it("детский центр → Мамы и дети", () => expect(suggestNiches("Детский центр развития")).toContain("Мамы и дети"));
  it("барбершоп → Красота и уход", () => expect(suggestNiches("Барбершоп на Абая")[0]).toBe("Красота и уход"));
  it("автомойка → Авто", () => expect(suggestNiches("Автомойка и детейлинг")[0]).toBe("Авто"));
  it("пусто → ничего", () => expect(suggestNiches("")).toEqual([]));
  it("не больше двух", () => expect(suggestNiches("кафе, салон красоты, фитнес зал").length).toBeLessThanOrEqual(2));
});
