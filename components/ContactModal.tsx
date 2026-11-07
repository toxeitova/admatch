"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getContactOrder, track } from "@/lib/analytics";
import { parseContact } from "@/lib/contact";
import { copy } from "@/lib/copy.ru";
import { IconCheck, IconClose, IconCopy } from "./Icons";

const m = copy.modal;
const cf = copy.confirm;

type Choice = "admatch" | "direct";
type Step =
  | { kind: "choose"; sending: Choice | null; error: boolean }
  | { kind: "admatch_done" }
  | { kind: "direct_done"; contact: string };

export interface ContactTarget {
  creatorId: string;
  handle: string;
  rank: number;
}

export function ContactModal({
  target,
  requestId,
  businessContact,
  onClose,
}: {
  target: ContactTarget;
  requestId: string;
  businessContact: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "choose", sending: null, error: false });
  const [order] = useState(getContactOrder);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "contact-modal-title";

  // фокус внутрь окна, Esc, блокировка прокрутки, возврат фокуса
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  async function choose(choice: Choice) {
    if (step.kind !== "choose" || step.sending) return;
    track("deal_choice", { creator_id: target.creatorId, choice, order }, requestId);
    setStep({ kind: "choose", sending: choice, error: false });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, creatorId: target.creatorId, choice }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error();
      setStep(choice === "admatch" ? { kind: "admatch_done" } : { kind: "direct_done", contact: data.contact ?? "" });
      dialogRef.current?.focus();
    } catch {
      setStep({ kind: "choose", sending: null, error: true });
    }
  }

  const options: Choice[] = order === "admatch_first" ? ["admatch", "direct"] : ["direct", "admatch"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-lift outline-none sm:max-w-2xl sm:rounded-card sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={m.close}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-ink"
        >
          <IconClose />
        </button>

        {step.kind === "choose" && (
          <>
            <h2 id={titleId} className="pr-10 text-xl font-extrabold sm:text-2xl">
              {m.title(target.handle)}
            </h2>
            {/* Обе карточки одинаковые по размеру и весу; порядок случаен на сессию */}
            <div className="mt-5 grid auto-rows-fr gap-3 sm:grid-cols-2">
              {options.map((choice) => {
                const o = choice === "admatch" ? m.admatch : m.direct;
                return (
                  <section
                    key={choice}
                    className="flex flex-col rounded-card border-2 border-line p-5"
                    aria-labelledby={`opt-${choice}`}
                  >
                    <h3 id={`opt-${choice}`} className="text-lg font-extrabold">
                      {o.title}
                    </h3>
                    <ul className="mt-3 flex-1 space-y-2 text-ink-muted">
                      {o.lines.map((l) => (
                        <li key={l} className="flex gap-2 leading-snug">
                          <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1E6B47]" />
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 rounded-lg bg-page px-3 py-2 text-sm font-bold text-ink">{o.price}</p>
                    <button
                      type="button"
                      onClick={() => choose(choice)}
                      disabled={step.sending !== null}
                      aria-describedby={`opt-${choice}`}
                      className="btn mt-5 w-full bg-ink text-white hover:bg-ink/85"
                    >
                      {step.sending === choice ? m.sending : m.choose}
                    </button>
                  </section>
                );
              })}
            </div>
            {step.error && (
              <p role="alert" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-ink">
                {copy.errors.server}
              </p>
            )}
            <p className="mt-4 text-center text-sm">
              <Link href="/terms" target="_blank" className="text-ink-muted underline underline-offset-2 hover:text-ink">
                {m.termsLink}
              </Link>
            </p>
          </>
        )}

        {step.kind === "admatch_done" && (
          <div className="pt-2 text-center sm:px-6">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF3E8] text-[#1E6B47]">
              <IconCheck className="h-7 w-7" />
            </span>
            <h2 id={titleId} className="mt-4 text-2xl font-extrabold">
              {cf.admatch.title}
            </h2>
            <p className="mt-3 leading-relaxed">{cf.admatch.text(target.handle, businessContact)}</p>
            <p className="mt-2 text-ink-muted">{cf.admatch.commission}</p>
            <button type="button" onClick={onClose} className="btn-secondary mt-6 w-full xs:w-auto">
              {cf.back}
            </button>
          </div>
        )}

        {step.kind === "direct_done" && (
          <DirectContact handle={target.handle} contact={step.contact} titleId={titleId} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function DirectContact({
  handle,
  contact,
  titleId,
  onClose,
}: {
  handle: string;
  contact: string;
  titleId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const info = parseContact(contact);

  async function copyContact() {
    try {
      await navigator.clipboard.writeText(info.display);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  return (
    <div className="pt-2">
      <h2 id={titleId} className="pr-10 text-xl font-extrabold sm:text-2xl">
        {cf.direct.title(handle)}
      </h2>
      <div className="mt-5 rounded-card bg-page p-5">
        <p className="select-all break-all text-2xl font-extrabold tracking-tight sm:text-3xl">{info.display}</p>
        <div className="mt-4 flex flex-col gap-2 xs:flex-row xs:flex-wrap">
          <button type="button" onClick={copyContact} className="btn-secondary">
            {copied === "ok" ? <IconCheck className="h-5 w-5" /> : <IconCopy />}
            {copied === "ok" ? cf.direct.copied : cf.direct.copy}
          </button>
          {info.kind === "phone" && (
            <a href={info.href} target="_blank" rel="noopener noreferrer" className="btn bg-[#1E7A4D] text-white hover:bg-[#17633E]">
              {cf.direct.whatsapp}
            </a>
          )}
          {info.kind === "telegram" && (
            <a href={info.href} target="_blank" rel="noopener noreferrer" className="btn bg-[#1F6FA8] text-white hover:bg-[#195C8C]">
              {cf.direct.telegram}
            </a>
          )}
        </div>
        {copied === "fail" && (
          <p role="alert" className="mt-2 text-sm text-accent-ink">
            {copy.errors.copyFailed}
          </p>
        )}
      </div>
      <p className="mt-4 leading-relaxed text-ink-muted">{cf.direct.tip}</p>
      <button type="button" onClick={onClose} className="btn-secondary mt-6 w-full xs:w-auto">
        {cf.back}
      </button>
    </div>
  );
}
