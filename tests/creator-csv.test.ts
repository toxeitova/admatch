import { readFileSync } from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { parseCreatorRow } from "@/lib/creatorCsv";

const template = parse(readFileSync(path.join(__dirname, "../creators_template.csv"), "utf8"), {
  columns: true,
  bom: true,
}) as Record<string, string>[];

describe("импорт CSV", () => {
  it("шаблон разбирается в запись creators", () => {
    const row = parseCreatorRow(template[0]);
    expect(row).toMatchObject({
      handle: "example_blogger",
      niches: ["Еда и рестораны", "Лайфстайл"],
      followers: 38200,
      er_pct: 6.1,
      price_tiktok: null,
      verified: true,
      consent: true,
      active: true,
      is_test: false,
      data_checked_at: "2026-10-01",
    });
  });

  it("заголовки шаблона совпадают с полями creators (кроме id и created_at)", () => {
    const sql = readFileSync(path.join(__dirname, "../supabase/migrations/0001_init.sql"), "utf8");
    const table = sql.slice(sql.indexOf("create table if not exists creators"), sql.indexOf("create index if not exists creators_niches_idx"));
    const cols = [...table.matchAll(/^\s{2}([a-z_]+)\s+(?:uuid|text|int|numeric|bool|date|timestamptz)/gm)].map((m) => m[1]);
    expect(Object.keys(template[0]).sort()).toEqual(cols.filter((c) => c !== "id" && c !== "created_at").sort());
  });

  it("понятные ошибки и нормализация", () => {
    const base = { ...template[0] };
    expect(() => parseCreatorRow({ ...base, niches: "Котики" })).toThrow(/неизвестные ниши/);
    expect(() => parseCreatorRow({ ...base, audience_gender: "x" })).toThrow(/audience_gender/);
    expect(() => parseCreatorRow({ ...base, almaty_share_pct: "120" })).toThrow(/0–100/);
    expect(parseCreatorRow({ ...base, handle: "@nick", er_pct: "4,5", price_reels: "45 000", last_post_at: "15.10.2026" })).toMatchObject({
      handle: "nick",
      er_pct: 4.5,
      price_reels: 45000,
      last_post_at: "2026-10-15",
    });
  });
});
