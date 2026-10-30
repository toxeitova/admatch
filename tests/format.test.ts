import { describe, expect, it } from "vitest";
import { formatCount, formatDate, formatPct, formatPrice, parseAmount, pluralRu } from "@/lib/format";

const S = " ";
const BLOGGERS = ["блогера", "блогера", "блогеров"] as const;

describe("format", () => {
  it("цены с пробелами", () => {
    expect(formatPrice(45000)).toBe(`45${S}000${S}₸`);
    expect(formatPrice(250000)).toBe(`250${S}000${S}₸`);
    expect(formatPrice(1500000)).toBe(`1${S}500${S}000${S}₸`);
  });

  it("подписчики", () => {
    expect(formatCount(38200)).toBe(`38,2${S}тыс.`);
    expect(formatCount(10000)).toBe(`10${S}тыс.`);
    expect(formatCount(950)).toBe("950");
    expect(formatCount(1250000)).toBe(`1,3${S}млн`);
  });

  it("проценты и даты", () => {
    expect(formatPct(6.1)).toBe("6,1%");
    expect(formatPct(72)).toBe("72%");
    expect(formatDate("2026-10-05")).toBe("5 октября 2026");
  });

  it("склонение «блогера/блогеров» в «Нашли N …»", () => {
    expect(pluralRu(1, BLOGGERS)).toBe("блогера");
    expect(pluralRu(2, BLOGGERS)).toBe("блогера");
    expect(pluralRu(5, BLOGGERS)).toBe("блогеров");
    expect(pluralRu(11, BLOGGERS)).toBe("блогеров");
    expect(pluralRu(21, BLOGGERS)).toBe("блогера");
    expect(pluralRu(10, ["блогер", "блогера", "блогеров"])).toBe("блогеров");
  });

  it("разбор бюджета", () => {
    expect(parseAmount("30 000")).toBe(30000);
    expect(parseAmount("")).toBeNull();
  });
});
