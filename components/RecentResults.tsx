"use client";

// A9: «Ваши прошлые подборки» — простая замена личного кабинета (T1, T3). Только на этом устройстве.
import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentResults, type RecentResult } from "@/lib/analytics";
import { copy } from "@/lib/copy.ru";

export function RecentResults({ exclude, className = "" }: { exclude?: string; className?: string }) {
  const [items, setItems] = useState<RecentResult[]>([]);
  useEffect(() => setItems(getRecentResults().filter((r) => r.id !== exclude)), [exclude]);
  if (items.length === 0) return null;
  return (
    <section className={`card p-5 ${className}`} aria-labelledby="recent-title">
      <h2 id="recent-title" className="text-lg font-extrabold">{copy.card.recentTitle}</h2>
      <ul className="mt-3 divide-y divide-line">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2">
            <Link href={`/results/${r.id}`} className="min-w-0 truncate font-semibold text-accent-ink hover:underline">
              {r.product}
            </Link>
            <span className="shrink-0 text-sm text-ink-faint">{new Date(r.at).toLocaleDateString("ru-RU")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-faint">{copy.card.recentNote}</p>
    </section>
  );
}
