"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/components/creator/ui";
import { PRICE_KEYS, PRICE_LABELS } from "@/lib/creatorValidation";
import type { CreatorProfile, PendingItem } from "@/lib/creatorData";
import { formatThousands } from "@/lib/format";

const n = (v: number | null | undefined) => (v == null ? "—" : formatThousands(v));
const STATUS: Record<string, string> = { draft: "заполняет", pending: "на проверке", approved: "в подборке", rejected: "отклонён" };

export function AdminPanel({ pending, stale, creators }: { pending: PendingItem[]; stale: CreatorProfile[]; creators: CreatorProfile[] }) {
  const router = useRouter();
  async function logout() {
    await postJson("/api/admin/logout", {});
    router.refresh();
  }
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Админка</h1>
        <button onClick={logout} className="btn-secondary btn-sm">Выйти</button>
      </div>

      <section>
        <h2 className="text-xl font-extrabold">Аналитика на проверку · {pending.length}</h2>
        {pending.length === 0 && <p className="mt-2 text-ink-muted">Новых отправок нет.</p>}
        <div className="mt-3 space-y-4">
          {pending.map((p) => <Review key={p.id} item={p} />)}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Пора обновить аналитику (больше 30 дней) · {stale.length}</h2>
        <ul className="mt-2 space-y-1">
          {stale.map((c) => (
            <li key={c.id} className="text-sm">@{c.handle} · проверено {c.data_checked_at} · {c.contact}</li>
          ))}
          {stale.length === 0 && <li className="text-ink-muted">Все свежие.</li>}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Блогеры с кабинетом · {creators.length}</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="border-b border-line"><th className="py-2">Ник</th><th>Статус</th><th>Подписчики</th><th>Проверено</th><th>Контакт</th></tr></thead>
            <tbody>
              {creators.map((c) => (
                <tr key={c.id} className="border-b border-line/60">
                  <td className="py-2 font-semibold">@{c.handle}</td>
                  <td>{STATUS[c.status] ?? c.status}</td>
                  <td>{n(c.followers)}</td>
                  <td>{c.data_checked_at ?? "—"}</td>
                  <td>{c.contact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Review({ item }: { item: PendingItem }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const c = item.creator;
  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    const r = await postJson("/api/admin/review", { submissionId: item.id, decision, note });
    setBusy(false);
    if (r.ok) router.refresh();
    else alert(String(r.data.error ?? "Ошибка"));
  }
  const row = (label: string, now: string, before?: string) => (
    <tr className="border-b border-line/60">
      <td className="py-1.5 text-ink-muted">{label}</td>
      <td className="font-semibold">{now}</td>
      <td className="text-ink-faint">{before ?? ""}</td>
    </tr>
  );
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-extrabold">
          <a href={`https://instagram.com/${c.handle}`} target="_blank" rel="noopener noreferrer" className="underline">@{c.handle}</a> · {c.display_name}
        </h3>
        <span className="text-sm text-ink-faint">{new Date(item.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" })} · {c.contact}</span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Ниши: {c.niches.join(", ")}</p>
      <div className="mt-3 grid gap-5 lg:grid-cols-2">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-ink-faint"><th /><th>Новое</th><th>Было</th></tr></thead>
          <tbody>
            {row("Подписчики", n(item.followers), n(c.followers))}
            {row("Алматы, %", n(item.almaty_share_pct), n(c.almaty_share_pct))}
            {row("Просмотры Reels", n(item.avg_reels_views), n(c.avg_reels_views))}
            {row("Охват сторис", n(item.stories_reach), n(c.stories_reach))}
            {row("ER, %", item.er_pct?.toString() ?? "—", c.er_pct?.toString() ?? "—")}
            {row("Возраст", `${item.audience_age_from ?? "?"}–${item.audience_age_to ?? "?"}`)}
            {row("Пол", item.audience_gender ?? "—")}
            {PRICE_KEYS.filter((k) => c[k]).map((k) => row(PRICE_LABELS[k], `${n(c[k])} ₸`))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-2">
          {item.screenshotIds.map((id) => (
            <a key={id} href={`/api/admin/screenshot/${id}`} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- скриншоты с нашего API */}
              <img src={`/api/admin/screenshot/${id}`} alt="Скриншот статистики" className="h-48 rounded-lg border border-line" />
            </a>
          ))}
        </div>
      </div>
      <input className="input mt-4" placeholder="Комментарий блогеру (если отклоняете — что исправить)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-3 flex gap-3">
        <button disabled={busy} onClick={() => decide("approve")} className="btn bg-[#1E6B47] text-white hover:bg-[#17583A]">Подтвердить</button>
        <button disabled={busy} onClick={() => decide("reject")} className="btn-secondary">Отклонить</button>
      </div>
    </article>
  );
}
