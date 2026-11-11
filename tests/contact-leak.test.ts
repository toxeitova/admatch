// contact блогера и бизнеса не должен попадать в публичные выборки и ответы.
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { PUBLIC_CREATOR_COLUMNS, PUBLIC_CREATOR_FIELDS, PUBLIC_REQUEST_COLUMNS, toPublicCreator } from "@/lib/publicCreator";
import { testCreatorRows } from "@/data/test-creators";

describe("contact не утекает", () => {
  it("белые списки колонок не содержат contact", () => {
    expect(PUBLIC_CREATOR_FIELDS as readonly string[]).not.toContain("contact");
    expect(PUBLIC_CREATOR_COLUMNS.split(",")).not.toContain("contact");
    expect(PUBLIC_REQUEST_COLUMNS.split(",")).not.toContain("contact");
  });

  it("toPublicCreator отбрасывает contact даже если он пришёл из БД", () => {
    const row = { ...testCreatorRows()[0], id: "x" };
    expect(row.contact).toBeTruthy();
    const pub = toPublicCreator(row);
    expect("contact" in pub).toBe(false);
    expect(JSON.stringify(pub)).not.toContain(row.contact!);
  });

  it("контакт блогера не отдаётся ни одним роутом (прямой контакт отключён)", () => {
    const routes = ["requests/route.ts", "requests/[id]/route.ts", "manual/route.ts", "events/route.ts", "contact/route.ts"];
    for (const r of routes) {
      const src = readFileSync(path.join(__dirname, "../app/api", r), "utf8");
      expect(src).not.toMatch(/contact:\s*creator/);
      expect(src).not.toContain("creator.contact");
    }
    const contactRoute = readFileSync(path.join(__dirname, "../app/api/contact/route.ts"), "utf8");
    expect(contactRoute).toMatch(/if \(choice === "direct"\) return json\(\{ error: "direct_disabled" \}, 400\)/);
  });
});
