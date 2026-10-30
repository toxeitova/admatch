// Проверяем миграцию и представления метрик на встроенном Postgres (PGlite), без Docker и облака.
import { readFileSync } from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { testCreatorRows } from "@/data/test-creators";

const migration = readFileSync(path.join(__dirname, "../supabase/migrations/0001_init.sql"), "utf8");
let db: PGlite;

async function insertCreators() {
  for (const row of testCreatorRows()) {
    const cols = Object.keys(row);
    const vals = Object.values(row);
    await db.query(
      `insert into creators (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
      vals,
    );
  }
}

async function event(session: string, name: string, props: object = {}) {
  await db.query("insert into events (session_id, name, props) values ($1, $2, $3)", [session, name, props]);
}

beforeAll(async () => {
  db = new PGlite();
  // В Supabase эти роли есть всегда; в чистом Postgres создаём для revoke.
  await db.exec("create role anon; create role authenticated;");
  await db.exec(migration);
  // миграция идемпотентна
  await db.exec(migration);
  await insertCreators();
});

describe("migration", () => {
  it("creates 6 tables with RLS enabled", async () => {
    const res = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
       where relname in ('creators','requests','matches','contact_requests','manual_requests','events')`,
    );
    expect(res.rows).toHaveLength(6);
    expect(res.rows.every((r) => r.relrowsecurity)).toBe(true);
    const policies = await db.query("select * from pg_policies");
    expect(policies.rows).toHaveLength(0);
  });

  it("seeds 15 test creators with test_ prefix", async () => {
    const res = await db.query<{ n: number }>(
      "select count(*)::int as n from creators where is_test and handle like 'test\\_%'",
    );
    expect(res.rows[0].n).toBe(15);
  });

  it("rejects invalid enum values", async () => {
    await expect(
      db.query("insert into creators (handle, niches, audience_gender) values ('x', '{Авто}', 'x')"),
    ).rejects.toThrow();
    await expect(
      db.query("insert into creators (handle, niches, almaty_share_pct) values ('y', '{Авто}', 101)"),
    ).rejects.toThrow();
  });

  it("updates contact_requests.updated_at on update", async () => {
    const r = await db.query<{ id: string }>(
      "insert into requests (product, niches, consent) values ('t', '{Авто}', true) returning id",
    );
    const c = await db.query<{ id: string }>("select id from creators limit 1");
    const cr = await db.query<{ id: string; updated_at: Date }>(
      `insert into contact_requests (request_id, creator_id, choice, updated_at)
       values ($1, $2, 'direct', now() - interval '1 day') returning id, updated_at`,
      [r.rows[0].id, c.rows[0].id],
    );
    const upd = await db.query<{ updated_at: Date; status: string }>(
      "update contact_requests set status = 'deal' where id = $1 returning updated_at, status",
      [cr.rows[0].id],
    );
    expect(upd.rows[0].updated_at.getTime()).toBeGreaterThan(cr.rows[0].updated_at.getTime());
    await db.exec("delete from requests");
  });
});

describe("metric views", () => {
  beforeAll(async () => {
    const creator = (await db.query<{ id: string }>("select id from creators order by handle limit 1")).rows[0].id;
    const mk = async (createdAgo: string) =>
      (
        await db.query<{ id: string }>(
          `insert into requests (product, niches, consent, created_at)
           values ('p', '{Еда и рестораны}', true, now() - $1::interval) returning id`,
          [createdAgo],
        )
      ).rows[0].id;

    const r1 = await mk("1 day"); // контакт в течение 14 дней
    const r2 = await mk("30 days"); // контакт через 20 дней — не считается
    await mk("2 days"); // без контакта
    await db.query(
      "insert into contact_requests (request_id, creator_id, choice, created_at) values ($1, $2, 'admatch', now())",
      [r1, creator],
    );
    await db.query(
      `insert into contact_requests (request_id, creator_id, choice, created_at)
       values ($1, $2, 'direct', now() - interval '10 days')`,
      [r2, creator],
    );

    // s1 проходит всю воронку, s2 — до card_opened, s3 — только форма
    for (const n of ["wishes_submitted", "results_viewed", "card_opened", "contact_clicked"]) await event("s1", n);
    await event("s1", "deal_choice", { choice: "admatch", order: "admatch_first" });
    await event("s1", "deal_choice", { choice: "direct", order: "admatch_first" });
    await event("s2", "wishes_submitted");
    await event("s2", "results_viewed");
    await event("s2", "card_opened");
    await event("s2", "card_opened");
    await event("s3", "wishes_submitted");
    await event("s1", "time_to_results", { seconds_from_landing: 60 });
    await event("s2", "time_to_results", { seconds_from_landing: 120 });
    await event("s3", "time_to_results", { seconds_from_landing: 300 });
  });

  it("v_e1 counts requests contacted within 14 days", async () => {
    const res = await db.query("select * from v_e1");
    expect(res.rows[0]).toEqual({ contacted_requests: 1, total_requests: 3 });
  });

  it("v_e2 computes admatch share", async () => {
    const res = await db.query<{ admatch_choices: number; total_choices: number; admatch_share_pct: string }>(
      "select * from v_e2",
    );
    expect(res.rows[0].admatch_choices).toBe(1);
    expect(res.rows[0].total_choices).toBe(2);
    expect(Number(res.rows[0].admatch_share_pct)).toBe(50);
  });

  it("v_funnel counts unique sessions per step in order", async () => {
    const res = await db.query<{ step: string; sessions: number }>("select step, sessions from v_funnel");
    expect(res.rows).toEqual([
      { step: "wishes_submitted", sessions: 3 },
      { step: "results_viewed", sessions: 2 },
      { step: "card_opened", sessions: 2 },
      { step: "contact_clicked", sessions: 1 },
      { step: "deal_choice", sessions: 1 },
    ]);
  });

  it("v_time_to_results returns the median", async () => {
    const res = await db.query<{ median_seconds_from_landing: number; samples: number }>(
      "select * from v_time_to_results",
    );
    expect(Number(res.rows[0].median_seconds_from_landing)).toBe(120);
    expect(res.rows[0].samples).toBe(3);
  });
});
