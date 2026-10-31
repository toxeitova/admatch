import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy.ru";
import { isValidContact, parseContact } from "@/lib/contact";
import { eventPropsSchemas, fieldErrors, requestSchema } from "@/lib/validation";

const valid = {
  product: "Кофейня в центре",
  city: "Алматы",
  niches: ["Еда и рестораны"],
  age_from: 18,
  age_to: 35,
  gender: "all",
  goal: "visits",
  budget_min: 30000,
  budget_max: 80000,
  deadline_type: "week",
  formats: [],
  contact: "+7 701 123 45 67",
  consent: true,
};

const errorsFor = (over: Record<string, unknown>) => {
  const r = requestSchema.safeParse({ ...valid, ...over });
  return r.success ? {} : fieldErrors(r.error);
};

describe("requestSchema", () => {
  it("принимает корректную заявку", () => {
    expect(requestSchema.safeParse(valid).success).toBe(true);
  });

  it("сообщения об ошибках из ТЗ", () => {
    expect(errorsFor({ product: "  " }).product).toBe(copy.errors.required);
    expect(errorsFor({ niches: [] }).niches).toBe(copy.errors.niches);
    expect(errorsFor({ niches: ["Авто", "Лайфстайл", "Путешествия", "Образование"] }).niches).toBe(copy.errors.niches);
    expect(errorsFor({ budget_max: 20000 }).budget_max).toBe(copy.errors.budget);
    expect(errorsFor({ age_from: 81 }).age_from).toBe(copy.errors.age);
    expect(errorsFor({ age_from: 7, age_to: 77 }).age_from).toBeUndefined();
    expect(errorsFor({ age_to: 90 }).age_to).toBe(copy.errors.age);
    expect(errorsFor({ contact: "привет" }).contact).toBe(copy.errors.contact);
    expect(errorsFor({ consent: false }).consent).toBe(copy.errors.consent);
    expect(errorsFor({ gender: undefined }).gender).toBe(copy.errors.required);
    expect(errorsFor({ budget_min: null }).budget_min).toBe(copy.errors.required);
    expect(errorsFor({ deadline_type: "date", deadline_date: "" }).deadline_date).toBe(copy.errors.required);
  });

  it("product до 200 символов", () => {
    expect(errorsFor({ product: "а".repeat(201) }).product).toBeTruthy();
  });
});

describe("контакт", () => {
  it.each(["+7 701 123 45 67", "87011234567", "+77011234567", "@coffee_shop", "t.me/coffee_shop", "701 123 45 67", "coffee_shop", "almaty_cafe"])(
    "валиден: %s",
    (c) => expect(isValidContact(c)).toBe(true),
  );
  it.each(["", "abc", "@ab", "12345", "coffee@mail"])("невалиден: %s", (c) => expect(isValidContact(c)).toBe(false));

  it("телефон → WhatsApp, @ник → Telegram", () => {
    expect(parseContact("8 (701) 123-45-67")).toMatchObject({ kind: "phone", href: "https://wa.me/77011234567" });
    expect(parseContact("@test_dasha")).toMatchObject({ kind: "telegram", href: "https://t.me/test_dasha" });
    expect(parseContact("test_dasha")).toMatchObject({ kind: "telegram", display: "@test_dasha" });
    expect(parseContact("https://t.me/test_dasha")).toMatchObject({ kind: "telegram", display: "@test_dasha" });
  });
});

describe("props событий", () => {
  it("deal_choice требует choice и order", () => {
    const id = "6f1c1f8e-3b7a-4c2e-9a51-2b7f0f3d2a10";
    expect(eventPropsSchemas.deal_choice.safeParse({ creator_id: id, choice: "admatch", order: "direct_first" }).success).toBe(true);
    expect(eventPropsSchemas.deal_choice.safeParse({ creator_id: id, choice: "admatch" }).success).toBe(false);
  });

  it("time_to_results — неотрицательное число", () => {
    expect(eventPropsSchemas.time_to_results.safeParse({ seconds_from_landing: 42.5 }).success).toBe(true);
    expect(eventPropsSchemas.time_to_results.safeParse({ seconds_from_landing: "42" }).success).toBe(false);
  });
});
