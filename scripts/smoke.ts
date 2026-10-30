// E2E-проверка запущенного сайта по чек-листу приёмки.
// Запуск: npm run smoke            (BASE_URL по умолчанию http://localhost:3000)
//         BASE_URL=https://admatch.vercel.app npm run smoke
// Нужны SHOW_TEST_DATA=true на сервере и загруженный seed.
// Пишет тестовые заявки и события с session_id smoke-… и в конце удаляет их (если задан service key),
// чтобы не искажать метрики эксперимента. KEEP_SMOKE_DATA=1 — не удалять.
import { randomUUID } from "crypto";
import { adminClient } from "./_db";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const SESSION = `smoke-${randomUUID()}`;
let failed = 0;

function check(ok: boolean, label: string, extra = "") {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failed++;
}

const hasKeyDeep = (v: unknown, key: string): boolean =>
  Array.isArray(v)
    ? v.some((x) => hasKeyDeep(x, key))
    : v !== null && typeof v === "object"
      ? Object.entries(v).some(([k, x]) => k === key || hasKeyDeep(x, key))
      : false;

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const ms = Math.round(performance.now() - t0);
  return { status: res.status, ms, data: (await res.json().catch(() => null)) as Record<string, unknown> | null };
}

const baseRequest = {
  product: "Smoke-тест",
  city: "Алматы",
  age_from: 18,
  age_to: 35,
  gender: "all",
  goal: "sales",
  deadline_type: "week",
  formats: [] as string[],
  contact: "@smoke_test_biz",
  consent: true,
  session_id: SESSION,
};

const scenarios = [
  { niches: ["Еда и рестораны"], budget_min: 30000, budget_max: 80000 },
  { niches: ["Красота и уход"], budget_min: 20000, budget_max: 60000, gender: "f", formats: ["reels", "stories"] },
  { niches: ["Мода и одежда", "Лайфстайл"], budget_min: 50000, budget_max: 150000, gender: "f", age_to: 30 },
  { niches: ["Мамы и дети", "Образование", "Дом и интерьер"], budget_min: 15000, budget_max: 40000, age_from: 25, age_to: 40 },
  { niches: ["Техника и гаджеты", "Авто"], budget_min: 100000, budget_max: 250000, gender: "m", formats: ["reels", "tiktok"], age_from: 20, age_to: 45 },
];

async function main() {
  console.log(`AdMatch smoke → ${BASE}\n`);
  // разные IP через x-forwarded-for, чтобы не упереться в лимит 10/час (на Vercel заголовок перезаписывается)
  const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

  // 1. Пять заявок: ≥3 блогера, ответ < 2 с, contact не утекает
  const ids: string[] = [];
  for (const s of scenarios) {
    const r = await post("/api/requests", { ...baseRequest, ...s }, { "x-forwarded-for": ip() });
    const id = r.data?.requestId as string | undefined;
    check(r.status === 200 && !!id, `POST /api/requests ${s.niches.join(", ")}`, `${r.status}, ${r.ms} мс`);
    check(r.ms < 2000, "  время ответа < 2 с", `${r.ms} мс`);
    if (!id) continue;
    ids.push(id);
    const g = await fetch(`${BASE}/api/requests/${id}`);
    const data = (await g.json()) as { matches: { score: number }[] };
    check(data.matches.length >= 3, "  найдено ≥ 3 блогеров", String(data.matches.length));
    check(!hasKeyDeep(data, "contact"), "  в GET /api/requests/[id] нет поля contact");
  }

  // 2. Валидация, honeypot, лимит
  const bad = await post("/api/requests", { ...baseRequest, niches: [] }, { "x-forwarded-for": ip() });
  check(bad.status === 400, "невалидная заявка → 400");
  const hp = await post("/api/requests", { ...baseRequest, ...scenarios[0], website: "http://spam" }, { "x-forwarded-for": ip() });
  check(hp.status === 200 && hp.data?.requestId === null, "honeypot → 200 без сохранения");
  const limitIp = ip();
  let last = 0;
  for (let i = 0; i < 11; i++) last = (await post("/api/requests", { ...baseRequest, ...scenarios[0] }, { "x-forwarded-for": limitIp })).status;
  check(last === 429, "11-я заявка с одного IP за час → 429", String(last));

  // 3. 1–2 блогера и пустая подборка
  const few = await post("/api/requests", { ...baseRequest, niches: ["Путешествия"], budget_min: 100000, budget_max: 160000 }, { "x-forwarded-for": ip() });
  const fewData = await (await fetch(`${BASE}/api/requests/${few.data?.requestId}`)).json();
  check(fewData.matches.length >= 1 && fewData.matches.length <= 2, "сценарий «1–2 блогера»", String(fewData.matches.length));
  const none = await post("/api/requests", { ...baseRequest, niches: ["Авто"], budget_min: 1000, budget_max: 5000 }, { "x-forwarded-for": ip() });
  const noneData = await (await fetch(`${BASE}/api/requests/${none.data?.requestId}`)).json();
  check(noneData.matches.length === 0, "пустая подборка");
  const manual = await post("/api/manual", { requestId: none.data?.requestId });
  check(manual.status === 200 && !hasKeyDeep(manual.data, "contact"), "POST /api/manual");

  // 4. Связаться: admatch без контакта, direct с контактом
  const reqId = ids[0];
  const first = (await (await fetch(`${BASE}/api/requests/${reqId}`)).json()).matches[0].creator.id as string;
  const adm = await post("/api/contact", { requestId: reqId, creatorId: first, choice: "admatch" });
  check(adm.status === 200 && adm.data?.ok === true && !hasKeyDeep(adm.data, "contact"), "contact admatch → { ok } без contact");
  const dir = await post("/api/contact", { requestId: reqId, creatorId: first, choice: "direct" });
  check(dir.status === 200 && typeof dir.data?.contact === "string" && !!dir.data.contact, "contact direct → { ok, contact }");
  const foreign = await post("/api/contact", { requestId: ids[1], creatorId: randomUUID(), choice: "direct" });
  check(foreign.status === 404, "контакт блогера не из подборки → 404");

  // 5. События: все 6 принимаются, чужие отбрасываются
  const ev = (name: string, props: object) => ({ sessionId: SESSION, requestId: reqId, name, props });
  const events = await post("/api/events", [
    ev("wishes_submitted", { niches: ["Еда и рестораны"], budget_min: 30000, budget_max: 80000, form_duration_sec: 95 }),
    ev("results_viewed", { matches_count: 4 }),
    ev("card_opened", { creator_id: first, rank: 1 }),
    ev("contact_clicked", { creator_id: first, rank: 1 }),
    ev("deal_choice", { creator_id: first, choice: "admatch", order: "admatch_first" }),
    ev("time_to_results", { seconds_from_landing: 140 }),
    ev("page_hacked", {}),
  ]);
  check(events.status === 200 && events.data?.accepted === 6, "POST /api/events: 6 событий принято, лишнее отброшено", JSON.stringify(events.data));

  // 6. Представления метрик (нужен service key)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = adminClient();
    for (const v of ["v_e1", "v_e2", "v_funnel", "v_time_to_results"]) {
      const { data, error } = await db.from(v).select("*");
      check(!error && !!data?.length, `представление ${v}`, error ? error.message : JSON.stringify(data));
    }
    if (!process.env.KEEP_SMOKE_DATA) {
      // каскадом удаляются matches, contact_requests, manual_requests
      const r1 = await db.from("requests").delete().eq("session_id", SESSION);
      const r2 = await db.from("events").delete().eq("session_id", SESSION);
      check(!r1.error && !r2.error, "тестовые данные smoke удалены", r1.error?.message ?? r2.error?.message ?? "");
    }
  } else {
    console.log("ℹ️  SUPABASE_URL не задан — представления не проверены, тестовые данные не удалены");
  }

  console.log(failed ? `\n${failed} проверок не прошли` : "\nВсе проверки прошли");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
