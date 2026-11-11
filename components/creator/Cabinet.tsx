"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatAvailability } from "@/lib/availability";
import { PRICE_KEYS, PRICE_LABELS, type PriceKey } from "@/lib/creatorValidation";
import { formatThousands } from "@/lib/format";
import { Field, NichePicker, postJson, toInt } from "./ui";

export interface CabinetData {
  profile: {
    handle: string;
    display_name: string | null;
    niches: string[];
    contact: string | null;
    tiktok_url: string | null;
    status: string;
    verified: boolean | null;
    followers: number | null;
    almaty_share_pct: number | null;
    avg_reels_views: number | null;
    stories_reach: number | null;
    er_pct: number | null;
    audience_age_from: number | null;
    audience_age_to: number | null;
    audience_gender: string | null;
    data_checked_at: string | null;
    production_included: boolean | null;
  } & Record<PriceKey, number | null>;
  submission: {
    status: string;
    admin_note: string | null;
    created_at: string;
    values: Record<string, number | string | null>;
  } | null;
  availability: string[];
  activity: { shown: number; shownMonth: number; opened: number; openedMonth: number; contacts: number; contactsMonth: number };
  statsAgeDays: number | null;
  today: string;
  welcome: boolean;
}

const fmtNum = (n: number | null) => (n == null ? "" : formatThousands(n));

export function Cabinet({ data }: { data: CabinetData }) {
  const router = useRouter();
  const p = data.profile;
  const sub = data.submission;
  const stale = p.verified && data.statsAgeDays != null && data.statsAgeDays >= 30;

  async function logout() {
    await postJson("/api/creator/logout", {});
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">@{p.handle}</h1>
          <p className="mt-1 text-ink-muted">{p.display_name}</p>
        </div>
        <button type="button" onClick={logout} className="btn-secondary btn-sm">Выйти</button>
      </div>

      <StatusBanner data={data} stale={!!stale} />

      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Ваша статистика в AdMatch</h2>
        <p className="mt-1 text-sm text-ink-muted">Сколько раз бизнесы видели и выбирали ваш профиль</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Tile label="Показы в подборках" total={data.activity.shown} month={data.activity.shownMonth} />
          <Tile label="Открыли вашу карточку" total={data.activity.opened} month={data.activity.openedMonth} />
          <Tile label="Хотят связаться" total={data.activity.contacts} month={data.activity.contactsMonth} />
        </div>
        {!p.verified && <p className="mt-3 text-sm text-ink-faint">Цифры начнут расти после проверки аналитики.</p>}
      </section>

      <StatsForm data={data} />
      <PricesForm data={data} />
      <AvailabilityForm initial={data.availability} today={data.today} />
      <ProfileForm data={data} />
      {sub && <p className="text-center text-xs text-ink-faint">Последняя отправка аналитики: {new Date(sub.created_at).toLocaleDateString("ru-RU", { timeZone: "Asia/Almaty" })}</p>}
    </div>
  );
}

function Tile({ label, total, month }: { label: string; total: number; month: number }) {
  return (
    <div className="rounded-xl bg-page px-4 py-3">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{total}</p>
      <p className="text-sm font-semibold text-[#1E6B47]">+{month} в этом месяце</p>
    </div>
  );
}

function StatusBanner({ data, stale }: { data: CabinetData; stale: boolean }) {
  const p = data.profile;
  const sub = data.submission;
  let tone = "bg-[#FFF1D6] text-[#8A5A00]";
  let text: React.ReactNode;
  if (sub?.status === "pending") {
    text = "Аналитика на проверке. Обычно проверяем за 24 часа.";
  } else if (stale) {
    tone = "bg-accent-soft text-accent-ink";
    text = `Аналитика обновлялась ${data.statsAgeDays} дн. назад. Пожалуйста, обновите её: раз в месяц, чтобы бизнесы видели свежие цифры.`;
  } else if (p.verified) {
    tone = "bg-[#DDF3E8] text-[#1E6B47]";
    text = `Профиль подтверждён и показывается бизнесам. Аналитика проверена ${p.data_checked_at ? new Date(p.data_checked_at).toLocaleDateString("ru-RU", { timeZone: "Asia/Almaty" }) : ""}.`;
  } else if (sub?.status === "rejected") {
    tone = "bg-accent-soft text-accent-ink";
    text = <>Аналитику не приняли{sub.admin_note ? `: ${sub.admin_note}` : ""}. Исправьте и отправьте ещё раз.</>;
  } else {
    text = data.welcome
      ? "Кабинет создан! Осталось 3 шага: аналитика со скриншотами, цены и свободные даты."
      : "Заполните аналитику со скриншотами, цены и даты. После проверки вас увидят бизнесы.";
  }
  return (
    <div className={`rounded-card px-5 py-4 font-semibold ${tone}`} role="status">
      {text}
      {sub?.status === "rejected" && p.verified && sub.admin_note && <p className="mt-1 text-sm">Последняя отправка не принята: {sub.admin_note}</p>}
    </div>
  );
}

// ─── Аналитика со скриншотами ─────────────────────────────────────────
async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 1080 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function StatsForm({ data }: { data: CabinetData }) {
  const router = useRouter();
  const p = data.profile;
  const pending = data.submission?.status === "pending";
  // пока аналитика на проверке, показываем отправленные цифры
  const src = (pending ? { ...p, ...data.submission!.values } : p) as typeof p;
  const [f, setF] = useState({
    followers: fmtNum(src.followers),
    almaty_share_pct: src.almaty_share_pct?.toString() ?? "",
    avg_reels_views: fmtNum(src.avg_reels_views),
    stories_reach: fmtNum(src.stories_reach),
    er_pct: src.er_pct?.toString() ?? "",
    audience_age_from: src.audience_age_from?.toString() ?? "",
    audience_age_to: src.audience_age_to?.toString() ?? "",
    audience_gender: src.audience_gender ?? "mixed",
  });
  const [shots, setShots] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = toInt(e.target.value);
    setF({ ...f, [k]: n == null ? "" : formatThousands(n) });
  };

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const list = [...files].slice(0, 5 - shots.length);
    const out: string[] = [];
    for (const file of list) out.push(await compress(file));
    setShots([...shots, ...out]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await postJson("/api/creator/stats", {
      followers: toInt(f.followers),
      almaty_share_pct: toInt(f.almaty_share_pct),
      avg_reels_views: toInt(f.avg_reels_views),
      stories_reach: toInt(f.stories_reach),
      er_pct: f.er_pct ? Number(f.er_pct.replace(",", ".")) : null,
      audience_age_from: toInt(f.audience_age_from),
      audience_age_to: toInt(f.audience_age_to),
      audience_gender: f.audience_gender,
      screenshots: shots,
    });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: "Отправили на проверку. Напишем, если что-то не так." });
      setShots([]);
      router.refresh();
    } else setMsg({ ok: false, text: String(r.data.error ?? "Не получилось отправить") });
  }

  return (
    <section className="card p-5 sm:p-6" id="stats">
      <h2 className="text-xl font-extrabold">Аналитика аккаунта</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Впишите цифры из статистики Instagram и приложите скриншоты. Админ сверит их и подтвердит. Обновляйте раз в месяц.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Подписчики *"><input className="input" inputMode="numeric" value={f.followers} onChange={num("followers")} disabled={pending} /></Field>
          <Field label="Аудитория из Алматы, % *"><input className="input" inputMode="numeric" value={f.almaty_share_pct} onChange={(e) => setF({ ...f, almaty_share_pct: e.target.value.replace(/\D/g, "").slice(0, 3) })} disabled={pending} /></Field>
          <Field label="Средние просмотры Reels"><input className="input" inputMode="numeric" value={f.avg_reels_views} onChange={num("avg_reels_views")} disabled={pending} /></Field>
          <Field label="Охват сторис"><input className="input" inputMode="numeric" value={f.stories_reach} onChange={num("stories_reach")} disabled={pending} /></Field>
          <Field label="Вовлечённость (ER), %"><input className="input" inputMode="decimal" value={f.er_pct} onChange={(e) => setF({ ...f, er_pct: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) })} disabled={pending} /></Field>
          <Field label="Пол аудитории">
            <select className="input" value={f.audience_gender} onChange={(e) => setF({ ...f, audience_gender: e.target.value })} disabled={pending}>
              <option value="mixed">Смешанная</option>
              <option value="f">В основном женщины</option>
              <option value="m">В основном мужчины</option>
            </select>
          </Field>
          <Field label="Возраст аудитории от"><input className="input" inputMode="numeric" value={f.audience_age_from} onChange={(e) => setF({ ...f, audience_age_from: e.target.value.replace(/\D/g, "").slice(0, 2) })} disabled={pending} /></Field>
          <Field label="Возраст аудитории до"><input className="input" inputMode="numeric" value={f.audience_age_to} onChange={(e) => setF({ ...f, audience_age_to: e.target.value.replace(/\D/g, "").slice(0, 2) })} disabled={pending} /></Field>
        </div>
        <div>
          <span className="field-label">Скриншоты статистики * (до 5)</span>
          <p className="field-hint mb-2">Профессиональная панель → Статистика: охват, подписчики (города, возраст, пол), просмотры Reels.</p>
          <div className="flex flex-wrap gap-3">
            {shots.map((s, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- локальное превью */}
                <img src={s} alt={`Скриншот ${i + 1}`} className="h-28 w-20 rounded-lg border border-line object-cover" />
                <button type="button" onClick={() => setShots(shots.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-ink text-xs font-bold text-white" aria-label="Убрать">×</button>
              </div>
            ))}
            {shots.length < 5 && !pending && (
              <label className="flex h-28 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-line text-3xl text-ink-faint hover:border-accent-strong">
                +
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
              </label>
            )}
          </div>
        </div>
        {msg && <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? "bg-[#DDF3E8] text-[#1E6B47]" : "bg-accent-soft text-accent-ink"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy || pending} className="btn-primary w-full sm:w-auto">
          {pending ? "На проверке" : busy ? "Отправляем…" : "Отправить на проверку"}
        </button>
      </form>
    </section>
  );
}

// ─── Цены ─────────────────────────────────────────────────────────────
function PricesForm({ data }: { data: CabinetData }) {
  const p = data.profile;
  const [vals, setVals] = useState<Record<PriceKey, string>>(
    Object.fromEntries(PRICE_KEYS.map((k) => [k, fmtNum(p[k])])) as Record<PriceKey, string>,
  );
  const [prod, setProd] = useState(!!p.production_included);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(PRICE_KEYS.map((k) => [k, toInt(vals[k])]));
    const r = await postJson("/api/creator/prices", { ...body, production_included: prod });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Цены сохранены" } : { ok: false, text: String(r.data.error ?? "Не получилось сохранить") });
  }

  return (
    <section className="card p-5 sm:p-6" id="prices">
      <h2 className="text-xl font-extrabold">Стоимость рекламы</h2>
      <p className="mt-1 text-sm text-ink-muted">Цена за один креатив, ₸. Оставьте пустым, если формат не делаете.</p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {PRICE_KEYS.map((k) => (
            <Field key={k} label={PRICE_LABELS[k]}>
              <div className="relative">
                <input
                  className="input pr-10"
                  inputMode="numeric"
                  value={vals[k]}
                  onChange={(e) => {
                    const n = toInt(e.target.value);
                    setVals({ ...vals, [k]: n == null ? "" : formatThousands(n) });
                  }}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-faint">₸</span>
              </div>
            </Field>
          ))}
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={prod} onChange={(e) => setProd(e.target.checked)} />
          <span>Съёмка и монтаж входят в цену</span>
        </label>
        {msg && <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? "bg-[#DDF3E8] text-[#1E6B47]" : "bg-accent-soft text-accent-ink"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? "Сохраняем…" : "Сохранить цены"}</button>
      </form>
    </section>
  );
}

// ─── Свободные даты ───────────────────────────────────────────────────
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function AvailabilityForm({ initial, today }: { initial: string[]; today: string }) {
  const [days, setDays] = useState<Set<string>>(new Set(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const y0 = Number(today.slice(0, 4));
  const m0 = Number(today.slice(5, 7)) - 1;
  const months = [0, 1, 2].map((i) => ({ y: y0 + Math.floor((m0 + i) / 12), m: (m0 + i) % 12 }));

  const toggle = (d: string) => {
    const next = new Set(days);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setDays(next);
    setMsg(null);
  };

  async function save() {
    setBusy(true);
    const r = await postJson("/api/creator/availability", { days: [...days] });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Даты сохранены. Команда AdMatch получит уведомление." } : { ok: false, text: "Не получилось сохранить" });
  }

  const summary = formatAvailability([...days]);
  return (
    <section className="card p-5 sm:p-6" id="dates">
      <h2 className="text-xl font-extrabold">Свободные даты</h2>
      <p className="mt-1 text-sm text-ink-muted">Нажмите на дни, когда можете снять рекламу. Мы получим уведомление, если вы их поменяете.</p>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        {months.map(({ y, m }) => {
          const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
          const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          return (
            <div key={`${y}-${m}`}>
              <p className="mb-2 font-bold">{MONTHS[m]} {y}</p>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-faint">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: count }, (_, i) => {
                  const d = iso(y, m, i + 1);
                  const past = d < today;
                  const on = days.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={past}
                      aria-pressed={on}
                      aria-label={d}
                      onClick={() => toggle(d)}
                      className={`h-9 rounded-lg text-sm font-semibold tabular-nums transition-colors disabled:opacity-25 ${
                        on ? "bg-[#2E9D6A] text-white" : "bg-page text-ink hover:bg-line"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm"><b>Выбрано:</b> {summary.length ? summary.join("; ") : "пока ничего"}</p>
      {msg && <p role="status" className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? "bg-[#DDF3E8] text-[#1E6B47]" : "bg-accent-soft text-accent-ink"}`}>{msg.text}</p>}
      <button type="button" onClick={save} disabled={busy} className="btn-primary mt-4 w-full sm:w-auto">{busy ? "Сохраняем…" : "Сохранить даты"}</button>
    </section>
  );
}

// ─── Профиль ──────────────────────────────────────────────────────────
function ProfileForm({ data }: { data: CabinetData }) {
  const p = data.profile;
  const [f, setF] = useState({ display_name: p.display_name ?? "", niches: p.niches, contact: p.contact ?? "", tiktok_url: p.tiktok_url ?? "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await postJson("/api/creator/profile", f);
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Профиль сохранён" } : { ok: false, text: "Проверьте поля" });
  }

  return (
    <section className="card p-5 sm:p-6" id="profile">
      <h2 className="text-xl font-extrabold">Профиль</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <Field label="Имя"><input className="input" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></Field>
        <NichePicker value={f.niches} onChange={(niches) => setF({ ...f, niches })} />
        <Field label="Телефон или Telegram для связи" hint="Не показываем бизнесам"><input className="input" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field>
        <Field label="TikTok"><input className="input" value={f.tiktok_url} onChange={(e) => setF({ ...f, tiktok_url: e.target.value })} /></Field>
        {msg && <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? "bg-[#DDF3E8] text-[#1E6B47]" : "bg-accent-soft text-accent-ink"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy} className="btn-secondary w-full sm:w-auto">{busy ? "Сохраняем…" : "Сохранить профиль"}</button>
      </form>
    </section>
  );
}
