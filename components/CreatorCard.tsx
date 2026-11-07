"use client";

import { useId, useState } from "react";
import { copy } from "@/lib/copy.ru";
import { formatCount, formatDate, formatPct, formatPrice } from "@/lib/format";
import { FORMAT_LABELS } from "@/lib/matching";
import type { Format } from "@/lib/niches";
import type { PublicMatch } from "@/lib/types";
import { IconBadgeCheck, IconChevron, IconExternal } from "./Icons";

const c = copy.card;
const PRICE_FIELDS: Array<[Format, "price_reels" | "price_stories" | "price_post" | "price_tiktok"]> = [
  ["reels", "price_reels"],
  ["stories", "price_stories"],
  ["post", "price_post"],
  ["tiktok", "price_tiktok"],
];
const AVATAR_COLORS = [
  "bg-[#FFE1DD] text-[#9E2219]",
  "bg-[#E6E0FF] text-[#4A2FBF]",
  "bg-[#DDF3E8] text-[#1E6B47]",
  "bg-[#FFEFCC] text-[#8A5A00]",
  "bg-[#DCEEFF] text-[#1D5A94]",
];

function colorFor(handle: string) {
  let h = 0;
  for (const ch of handle) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ handle, url, size = 56 }: { handle: string; url: string | null; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- внешние аватары из Supabase Storage/соцсетей
      <img
        src={url}
        alt={c.avatarAlt(handle)}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full text-xl font-extrabold uppercase ${colorFor(handle)}`}
      style={{ width: size, height: size }}
    >
      {handle.replace(/^test_/, "").charAt(0)}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-page px-3 py-2.5">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

const orDash = <T,>(v: T | null | undefined, fmt: (v: T) => string) => (v == null ? c.noData : fmt(v));

export function CreatorCard({
  match,
  onOpen,
  onContact,
}: {
  match: PublicMatch;
  onOpen: () => void;
  onContact: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const { creator: cr, score, whyFits, parts } = match;
  const prices = PRICE_FIELDS.filter(([, field]) => cr[field] != null);

  const toggle = () => {
    if (!expanded) onOpen();
    setExpanded((v) => !v);
  };

  const ageText =
    cr.audience_age_from != null && cr.audience_age_to != null
      ? c.audienceAge(cr.audience_age_from, cr.audience_age_to)
      : null;
  const genderText = cr.audience_gender ? c.audienceGender[cr.audience_gender] : null;
  const audience = c.audienceValue(ageText, genderText);

  return (
    <article className="card p-5 sm:p-6" aria-labelledby={`${detailsId}-title`}>
      {/* Шапка */}
      <div className="flex items-center gap-3">
        <Avatar handle={cr.handle} url={cr.avatar_url} />
        <div className="min-w-0 flex-1">
          <h2 id={`${detailsId}-title`} className="break-all text-lg font-extrabold leading-tight sm:truncate">
            @{cr.handle}
          </h2>
          {cr.display_name && <p className="truncate text-sm text-ink-muted">{cr.display_name}</p>}
          <FitBadge score={score} className="mt-1.5 sm:hidden" />
        </div>
        <FitBadge score={score} className="hidden shrink-0 sm:inline-flex" />
      </div>

      {/* Ниши */}
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ниши">
        {cr.niches.map((n) => (
          <li key={n} className="chip">
            {n}
          </li>
        ))}
      </ul>

      {/* Цифры */}
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label={c.followers} value={orDash(cr.followers, formatCount)} />
        <Metric label={c.almaty} value={orDash(cr.almaty_share_pct, formatPct)} />
        <Metric label={c.reelsViews} value={orDash(cr.avg_reels_views, formatCount)} />
        <Metric label={c.er} value={orDash(cr.er_pct, formatPct)} />
      </dl>

      {/* A8, Версия B: дата проверки статистики видна сразу (замечание T5), а не только в «Подробнее» */}
      {cr.data_checked_at && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#1E6B47]">
          <IconBadgeCheck />
          {c.verified(formatDate(cr.data_checked_at))}
        </p>
      )}

      {/* Цены */}
      {prices.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold text-ink-muted">{c.prices}</h3>
          <ul className="mt-1.5 space-y-1">
            {prices.map(([fmt, field]) => (
              <li key={fmt} className="font-semibold tabular-nums">
                {c.priceLine(FORMAT_LABELS[fmt], formatPrice(cr[field]!))}
              </li>
            ))}
          </ul>
          {cr.production_included && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#DDF3E8] px-3 py-1 text-sm font-semibold text-[#1E6B47]">
              {c.productionIncluded}
            </p>
          )}
        </div>
      )}

      {/* Почему подходит */}
      {whyFits && (
        <div className="mt-5 rounded-xl border border-line px-4 py-3">
          <h3 className="text-sm font-bold">{c.whyFits}</h3>
          <p className="mt-1 leading-relaxed text-ink-muted">{whyFits}</p>
        </div>
      )}

      {/* A9: из чего сложился процент (T5) */}
      {parts && (
        <div className="mt-4 rounded-xl bg-[#F1FAF5] px-4 py-3">
          <h3 className="text-sm font-bold text-[#1E6B47]">{c.partsTitle(score)}</h3>
          <ul className="mt-2 space-y-1.5">
            {([["niche", 40], ["budget", 20], ["audience", 20], ["almaty", 10], ["er", 10]] as const).map(([k, max]) => (
              <li key={k} className="grid grid-cols-[1fr_96px_44px] items-center gap-2 text-sm">
                <span className="text-ink-muted">{c.parts[k]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white">
                  <span className="block h-full rounded-full bg-[#2E9D6A]" style={{ width: `${Math.round((parts[k] / max) * 100)}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {parts[k]}/{max}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* A9: профиль блогера сразу на карточке (T2, T5) */}
      {cr.instagram_url && (
        <a
          href={cr.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-accent-ink underline-offset-4 hover:underline"
        >
          {c.profile}
          <IconExternal className="h-4 w-4" />
        </a>
      )}

      {/* Полная карточка */}
      {expanded && (
        <div id={detailsId} className="mt-5 space-y-3 border-t border-line pt-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {audience && (
              <div>
                <dt className="text-sm font-bold text-ink-muted">{c.audience}</dt>
                <dd className="mt-0.5 font-semibold">{audience}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-bold text-ink-muted">{c.storiesReach}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{orDash(cr.stories_reach, formatCount)}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {cr.past_ad_url && <ExtLink href={cr.past_ad_url}>{c.pastAd}</ExtLink>}
            {cr.instagram_url && <ExtLink href={cr.instagram_url}>{c.instagram}</ExtLink>}
            {cr.tiktok_url && <ExtLink href={cr.tiktok_url}>{c.tiktok}</ExtLink>}
          </div>

          {cr.last_post_at && <p className="text-sm text-ink-muted">{c.active(formatDate(cr.last_post_at))}</p>}
        </div>
      )}

      {/* Действия */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="btn-secondary"
        >
          {expanded ? c.less : c.more}
          <IconChevron className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button type="button" onClick={onContact} className="btn-primary">
          {c.contact}
        </button>
      </div>
    </article>
  );
}

function FitBadge({ score, className }: { score: number; className: string }) {
  return (
    // A8, Версия B: зелёный бейдж вместо красного (замечание T2: красный читается как «плохо»)
    <span
      title={c.fitExplain}
      className={`inline-flex rounded-full bg-[#DDF3E8] px-3 py-1 text-sm font-bold text-[#1E6B47] ${className}`}
    >
      {c.fit(score)}
    </span>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  // ссылки приходят из таблицы — пропускаем только http(s)
  if (!/^https?:\/\//i.test(href)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink/40"
    >
      {children}
      <IconExternal />
    </a>
  );
}
