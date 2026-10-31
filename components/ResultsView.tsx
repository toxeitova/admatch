"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getRequestContact, markResultsViewed, secondsFromLanding, track } from "@/lib/analytics";
import { copy } from "@/lib/copy.ru";
import { formatPrice, pluralRu } from "@/lib/format";
import type { PublicMatch, PublicRequest } from "@/lib/types";
import { ContactModal, type ContactTarget } from "./ContactModal";
import { CreatorCard } from "./CreatorCard";
import { IconCheck, IconSearch } from "./Icons";

const r = copy.results;

export function ResultsView({ request, matches }: { request: PublicRequest; matches: PublicMatch[] }) {
  const n = matches.length;
  const [contactTarget, setContactTarget] = useState<ContactTarget | null>(null);
  const [businessContact, setBusinessContact] = useState<string>(copy.contactFallback);

  useEffect(() => {
    const saved = getRequestContact(request.id);
    if (saved) setBusinessContact(saved);
    if (markResultsViewed(request.id)) {
      track("results_viewed", { matches_count: n }, request.id);
      track("time_to_results", { seconds_from_landing: secondsFromLanding() }, request.id);
    }
  }, [request.id, n]);

  const closeModal = useCallback(() => setContactTarget(null), []);

  return (
    <>
      {n > 0 ? (
        <header>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {r.h1(n, pluralRu(n, r.bloggerForms))}
          </h1>
          <p className="mt-3 text-lg text-ink-muted">{r.subtitle}</p>
          {/* A8, Версия B: объясняем, как считается процент (замечание T5) */}
          <details className="mt-3 max-w-2xl rounded-xl border border-line bg-white px-4 py-3 text-sm">
            <summary className="cursor-pointer font-bold text-ink">{copy.card.fitHow}</summary>
            <p className="mt-2 leading-relaxed text-ink-muted">{copy.card.fitExplain}</p>
          </details>
          <RequestSummary request={request} />
        </header>
      ) : (
        <EmptyState requestId={request.id} contact={businessContact} />
      )}

      {n > 0 && (
        <ol className="mt-8 space-y-4">
          {matches.map((m) => (
            <li key={m.creator.id}>
              <CreatorCard
                match={m}
                onOpen={() => track("card_opened", { creator_id: m.creator.id, rank: m.rank }, request.id)}
                onContact={() => {
                  track("contact_clicked", { creator_id: m.creator.id, rank: m.rank }, request.id);
                  setContactTarget({ creatorId: m.creator.id, handle: m.creator.handle, rank: m.rank });
                }}
              />
            </li>
          ))}
        </ol>
      )}

      {(n === 1 || n === 2) && (
        <div className="mt-6 rounded-card border-2 border-dashed border-accent/50 bg-accent-soft p-5 sm:p-6">
          <p className="font-semibold leading-relaxed">{copy.manual.banner}</p>
          <ManualRequest requestId={request.id} contact={businessContact} className="mt-4" />
        </div>
      )}

      {contactTarget && (
        <ContactModal
          target={contactTarget}
          requestId={request.id}
          businessContact={businessContact}
          onClose={closeModal}
        />
      )}
    </>
  );
}

function RequestSummary({ request }: { request: PublicRequest }) {
  const chips = [
    ...request.niches,
    `${r.summaryBudget(formatPrice(request.budget_min).replace(/ ₸$/, ""), formatPrice(request.budget_max))}`,
    `${r.summaryGender[request.gender]}, ${r.summaryAge(request.age_from, request.age_to)}`,
  ];
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c} className="chip bg-white shadow-soft">
          {c}
        </span>
      ))}
      <Link
        href="/request?edit=1"
        className="ml-1 inline-flex min-h-[40px] items-center text-sm font-bold text-accent-ink underline underline-offset-4"
      >
        {r.editRequest}
      </Link>
    </div>
  );
}

function EmptyState({ requestId, contact }: { requestId: string; contact: string }) {
  const e = copy.empty;
  return (
    <section className="card flex flex-col items-center px-5 py-10 text-center sm:px-10" aria-labelledby="empty-title">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <IconSearch className="h-8 w-8" />
      </span>
      <h1 id="empty-title" className="mt-5 text-2xl font-extrabold sm:text-3xl">
        {e.title}
      </h1>
      <p className="mt-3 max-w-lg leading-relaxed text-ink-muted">{e.text}</p>
      <ManualRequest
        requestId={requestId}
        contact={contact}
        className="mt-7 flex w-full flex-col items-center"
        extra={
          <Link href="/request?edit=1" className="btn-secondary w-full xs:w-auto">
            {e.edit}
          </Link>
        }
      />
    </section>
  );
}

function ManualRequest({
  requestId,
  contact,
  className = "",
  extra,
}: {
  requestId: string;
  contact: string;
  className?: string;
  extra?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    setState("sending");
    try {
      const res = await fetch("/api/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className={`${className} flex items-start gap-2 font-semibold text-[#1E6B47]`}>
        <IconCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{copy.manual.done(contact)}</span>
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex w-full flex-col gap-3 xs:w-auto xs:flex-row">
        <button type="button" onClick={send} disabled={state === "sending"} className="btn-primary w-full xs:w-auto">
          {state === "sending" ? copy.manual.sending : copy.manual.button}
        </button>
        {extra}
      </div>
      {state === "error" && (
        <p role="alert" className="mt-3 text-sm font-semibold text-accent-ink">
          {copy.errors.server}
        </p>
      )}
    </div>
  );
}
