import { describe, expect, it } from "vitest";
import { admatchDealMessage, directContactMessage, manualRequestMessage, newRequestMessage } from "@/lib/telegram";

process.env.NEXT_PUBLIC_SITE_URL = "https://admatch.kz/";

describe("шаблоны Telegram", () => {
  it("новая заявка", () => {
    expect(
      newRequestMessage({
        id: "abc",
        product: "Кофейня",
        niches: ["Еда и рестораны", "Лайфстайл"],
        budget_min: 30000,
        budget_max: 80000,
        contact: "@biz",
        found: 4,
      }),
    ).toBe(
      "🆕 Новая заявка\nКофейня\nНиши: Еда и рестораны, Лайфстайл\nБюджет: 30 000–80 000 ₸\nПодобрано: 4\nКонтакт: @biz\nhttps://admatch.kz/results/abc",
    );
  });

  it("через AdMatch", () => {
    expect(admatchDealMessage({ requestId: "abc", product: "Кофейня", handle: "dasha", contact: "@biz" })).toBe(
      "💰 СДЕЛКА через AdMatch\nБизнес: Кофейня\nБлогер: @dasha\nКонтакт бизнеса: @biz\nПроверить, свободен ли, и ответить за 24 ч\nhttps://admatch.kz/results/abc",
    );
  });

  it("напрямую и ручной подбор", () => {
    expect(directContactMessage({ product: "Кофейня", handle: "dasha" })).toBe("➡️ Прямой контакт: Кофейня → @dasha");
    expect(manualRequestMessage({ requestId: "abc", product: "Кофейня", found: 1, contact: "@biz" })).toBe(
      "🔍 РУЧНОЙ ПОДБОР\nКофейня\nНайдено: 1\nКонтакт: @biz\nhttps://admatch.kz/results/abc",
    );
  });
});

describe("детали заявки в уведомлениях", () => {
  const details = {
    goal: "visits",
    deadline: "2026-11-05",
    formats: ["reels", "stories"],
    content_requirements: "Без мата, съёмка у нас",
    liked_creators: "@dasha",
  };

  it("через AdMatch — с целью, сроками, форматами, требованиями и понравившимися", () => {
    expect(admatchDealMessage({ requestId: "abc", product: "Кофейня", handle: "dasha", contact: "@biz", details })).toBe(
      [
        "💰 СДЕЛКА через AdMatch",
        "Бизнес: Кофейня",
        "Блогер: @dasha",
        "Контакт бизнеса: @biz",
        "Проверить, свободен ли, и ответить за 24 ч",
        "Цель: Визиты в заведение",
        "Сроки: 5 ноября 2026",
        "Форматы: Reels, Stories",
        "Требования к контенту: Без мата, съёмка у нас",
        "Нравятся блогеры: @dasha",
        "https://admatch.kz/results/abc",
      ].join("\n"),
    );
  });

  it("ручной подбор — пустые поля пропускаются, пустые форматы = любые", () => {
    const msg = manualRequestMessage({
      requestId: "abc",
      product: "Кофейня",
      found: 0,
      contact: "@biz",
      details: { goal: "sales", deadline: "week", formats: [], content_requirements: " ", liked_creators: null },
    });
    expect(msg).toBe(
      "🔍 РУЧНОЙ ПОДБОР\nКофейня\nНайдено: 0\nКонтакт: @biz\nЦель: Продажи\nСроки: В течение недели\nФорматы: любые\nhttps://admatch.kz/results/abc",
    );
  });
});
