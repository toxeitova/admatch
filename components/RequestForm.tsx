"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSessionId, getUtm, loadDraft, saveDraft, saveRequestContact, track } from "@/lib/analytics";
import { copy } from "@/lib/copy.ru";
import { formatThousands, parseAmount } from "@/lib/format";
import { CITIES, DEADLINES, FORMATS, GENDERS, GOALS, NICHES, type Format } from "@/lib/niches";
import { fieldErrors, requestSchema } from "@/lib/validation";
import { suggestNiches } from "@/lib/nicheSuggest";

const f = copy.form;
const MAX_NICHES = 3;

export interface FormState {
  product: string;
  city: string;
  niches: string[];
  age_from: string;
  age_to: string;
  gender: string;
  goal: string;
  budget_min: string;
  budget_max: string;
  deadline_type: string;
  deadline_date: string;
  formats: Format[];
  content_requirements: string;
  liked_creators: string;
  contact: string;
  consent: boolean;
  website: string;
}

const INITIAL: FormState = {
  product: "",
  city: CITIES[0],
  niches: [],
  age_from: "18",
  age_to: "35",
  gender: "",
  goal: "",
  budget_min: "",
  budget_max: "",
  deadline_type: "",
  deadline_date: "",
  formats: [],
  content_requirements: "",
  liked_creators: "",
  contact: "",
  consent: false,
  website: "",
};

// порядок для фокуса на первой ошибке
const FIELD_ORDER = [
  "product", "city", "niches", "age_from", "age_to", "gender", "goal",
  "budget_min", "budget_max", "deadline_type", "deadline_date", "formats",
  "content_requirements", "liked_creators", "contact", "consent",
];

const toNum = (s: string) => (s.trim() === "" ? undefined : Number(s));

function toPayload(s: FormState) {
  return {
    product: s.product,
    city: s.city,
    niches: s.niches,
    age_from: toNum(s.age_from),
    age_to: toNum(s.age_to),
    gender: s.gender || undefined,
    goal: s.goal || undefined,
    budget_min: parseAmount(s.budget_min) ?? undefined,
    budget_max: parseAmount(s.budget_max) ?? undefined,
    deadline_type: s.deadline_type || undefined,
    deadline_date: s.deadline_type === "date" ? s.deadline_date : null,
    formats: s.formats,
    content_requirements: s.content_requirements,
    liked_creators: s.liked_creators,
    contact: s.contact,
    consent: s.consent,
    website: s.website,
  };
}

function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function RequestForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);

  // «Изменить запрос»: предзаполняем из localStorage
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit") !== "1") return;
    const draft = loadDraft<Partial<FormState>>();
    if (draft) setState((s) => ({ ...s, ...draft, consent: false, website: "" }));
  }, []);

  const markStarted = () => {
    if (startedAt.current === null) startedAt.current = Date.now();
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    markStarted();
    const next = { ...state, [key]: value };
    setState(next);
    // после первой попытки отправки показываем ошибки сразу при исправлении
    if (submitted) {
      const r = requestSchema.safeParse(toPayload(next));
      setErrors(r.success ? {} : fieldErrors(r.error));
    }
  }

  function toggleNiche(n: string) {
    const has = state.niches.includes(n);
    if (!has && state.niches.length >= MAX_NICHES) return;
    update("niches", has ? state.niches.filter((x) => x !== n) : [...state.niches, n]);
  }

  function toggleFormat(fmt: Format) {
    update("formats", state.formats.includes(fmt) ? state.formats.filter((x) => x !== fmt) : [...state.formats, fmt]);
  }

  function focusFirstError(errs: Record<string, string>) {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (!first) return;
    const el = document.getElementById(`field-${first}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el?.matches("input,textarea,select,button")
      ? el
      : el?.querySelector<HTMLElement>("input,textarea,select,button");
    focusable?.focus({ preventScroll: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    setFormError(null);

    const payload = toPayload(state);
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, session_id: getSessionId(), ...getUtm() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data.fields) {
        setErrors(data.fields);
        focusFirstError(data.fields);
        setSubmitting(false);
        return;
      }
      if (res.status === 429) throw new Error(f.tooMany);
      if (!res.ok) throw new Error(copy.errors.server);
      if (!data.requestId) {
        setSubmitting(false);
        return;
      }

      const requestId: string = data.requestId;
      saveDraft({ ...state, consent: false, website: "" });
      saveRequestContact(requestId, parsed.data.contact);
      track(
        "wishes_submitted",
        {
          niches: parsed.data.niches,
          budget_min: parsed.data.budget_min,
          budget_max: parsed.data.budget_max,
          form_duration_sec: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0,
        },
        requestId,
      );
      router.push(`/results/${requestId}`);
    } catch (err) {
      setFormError(err instanceof Error && err.message === f.tooMany ? f.tooMany : copy.errors.server);
      setSubmitting(false);
    }
  }

  const err = (k: string) => errors[k];
  const describedBy = (k: string, hint?: boolean) =>
    [hint ? `hint-${k}` : null, err(k) ? `error-${k}` : null].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} noValidate onFocus={markStarted} className="space-y-7">
      {/* 1. Что продвигаете */}
      <div>
        <label htmlFor="field-product" className="field-label">
          {f.product.label} <Req />
        </label>
        <input
          id="field-product"
          className={`input ${err("product") ? "input-invalid" : ""}`}
          placeholder={f.product.placeholder}
          maxLength={200}
          value={state.product}
          onChange={(e) => update("product", e.target.value)}
          aria-invalid={!!err("product")}
          aria-describedby={describedBy("product")}
        />
        <FieldError id="product" message={err("product")} />
      </div>

      {/* 2. Город */}
      <div>
        <label htmlFor="field-city" className="field-label">
          {f.city.label} <Req />
        </label>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <select
            id="field-city"
            className="input w-auto min-w-[160px] pr-10"
            value={state.city}
            onChange={(e) => update("city", e.target.value)}
            aria-describedby="hint-city"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span id="hint-city" className="text-sm text-ink-faint">
            {f.city.soon}
          </span>
        </div>
      </div>

      {/* 3. Ниши */}
      <fieldset id="field-niches" aria-describedby={describedBy("niches", true)}>
        <legend className="field-label">
          {f.niches.label} <Req />
        </legend>
        {/* A9: подсказка ниш по описанию продукта (T2) */}
        {(() => {
          const sug = suggestNiches(state.product).filter((n) => !state.niches.includes(n));
          if (sug.length === 0 || state.niches.length >= MAX_NICHES) return null;
          return (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#DDF3E8] px-3 py-2" aria-live="polite">
              <span className="text-sm font-semibold text-[#1E6B47]">{f.niches.suggest}</span>
              {sug.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNiche(n)}
                  className="rounded-full border border-[#1E6B47] bg-white px-3 py-1 text-sm font-bold text-[#1E6B47] hover:bg-[#1E6B47] hover:text-white"
                >
                  + {n}
                </button>
              ))}
            </div>
          );
        })()}
        <div className="flex flex-wrap gap-2">
          {NICHES.map((n) => {
            const selected = state.niches.includes(n);
            const disabled = !selected && state.niches.length >= MAX_NICHES;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggleNiche(n)}
                className={chipClass(selected)}
              >
                {selected && <CheckMark />}
                {n}
              </button>
            );
          })}
        </div>
        <p id="hint-niches" className="field-hint">
          {f.niches.hint}
        </p>
        <FieldError id="niches" message={err("niches")} />
      </fieldset>

      {/* 4. Возраст */}
      <fieldset>
        <legend className="field-label">
          {f.age.label} <Req />
        </legend>
        <div className="grid max-w-xs grid-cols-2 gap-3">
          <NumberBox
            id="age_from"
            label={f.age.from}
            value={state.age_from}
            onChange={(v) => update("age_from", v)}
            invalid={!!err("age_from")}
            describedBy={describedBy("age_from")}
          />
          <NumberBox
            id="age_to"
            label={f.age.to}
            value={state.age_to}
            onChange={(v) => update("age_to", v)}
            invalid={!!err("age_to")}
            describedBy={describedBy("age_to")}
          />
        </div>
        <p id="hint-age" className="field-hint">
          {f.age.hint}
        </p>
        <FieldError id="age_from" message={err("age_from")} />
        {!err("age_from") && <FieldError id="age_to" message={err("age_to")} />}
      </fieldset>

      {/* 5. Пол */}
      <fieldset id="field-gender">
        <legend className="field-label">
          {f.gender.label} <Req />
        </legend>
        <div className="grid grid-cols-3 gap-1 rounded-card bg-white p-1 shadow-soft" role="radiogroup">
          {GENDERS.map((g) => (
            <label key={g} className="relative">
              <input
                type="radio"
                name="gender"
                value={g}
                checked={state.gender === g}
                onChange={() => update("gender", g)}
                className="peer sr-only"
                aria-describedby={describedBy("gender")}
              />
              <span className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-2 text-center text-sm font-bold text-ink-muted transition-colors peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent-strong">
                {f.gender.options[g]}
              </span>
            </label>
          ))}
        </div>
        <FieldError id="gender" message={err("gender")} />
      </fieldset>

      {/* 6. Цель */}
      <fieldset id="field-goal">
        <legend className="field-label">
          {f.goal.label} <Req />
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {GOALS.map((g) => (
            <RadioCard
              key={g}
              name="goal"
              value={g}
              checked={state.goal === g}
              onChange={() => update("goal", g)}
              label={f.goal.options[g]}
              describedBy={describedBy("goal")}
            />
          ))}
        </div>
        <FieldError id="goal" message={err("goal")} />
      </fieldset>

      {/* 7. Бюджет */}
      <fieldset aria-describedby="hint-budget">
        <legend className="field-label">
          {f.budget.label} <Req />
        </legend>
        <BudgetSlider
          min={state.budget_min}
          max={state.budget_max}
          onChange={(lo, hi) => {
            markStarted();
            const next = { ...state, budget_min: lo, budget_max: hi };
            setState(next);
            if (submitted) {
              const r = requestSchema.safeParse(toPayload(next));
              setErrors(r.success ? {} : fieldErrors(r.error));
            }
          }}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
          <MoneyBox
            id="budget_min"
            label={f.budget.from}
            placeholder={f.budget.placeholderFrom}
            value={state.budget_min}
            onChange={(v) => update("budget_min", v)}
            invalid={!!err("budget_min")}
            describedBy={describedBy("budget_min")}
          />
          <MoneyBox
            id="budget_max"
            label={f.budget.to}
            placeholder={f.budget.placeholderTo}
            value={state.budget_max}
            onChange={(v) => update("budget_max", v)}
            invalid={!!err("budget_max")}
            describedBy={describedBy("budget_max")}
          />
        </div>
        <p id="hint-budget" className="field-hint">
          {f.budget.hint}
        </p>
        <FieldError id="budget_min" message={err("budget_min")} />
        {!err("budget_min") && <FieldError id="budget_max" message={err("budget_max")} />}
      </fieldset>

      {/* 8. Сроки */}
      <fieldset id="field-deadline_type">
        <legend className="field-label">
          {f.deadline.label} <Req />
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEADLINES.map((d) => (
            <RadioCard
              key={d}
              name="deadline"
              value={d}
              checked={state.deadline_type === d}
              onChange={() => update("deadline_type", d)}
              label={f.deadline.options[d]}
              describedBy={describedBy("deadline_type")}
            />
          ))}
        </div>
        <FieldError id="deadline_type" message={err("deadline_type")} />
        {state.deadline_type === "date" && (
          <div className="mt-3 max-w-xs">
            <label htmlFor="field-deadline_date" className="mb-1.5 block text-sm font-semibold text-ink-muted">
              {f.deadline.dateLabel}
            </label>
            <input
              id="field-deadline_date"
              type="date"
              min={todayIso()}
              className={`input ${err("deadline_date") ? "input-invalid" : ""}`}
              value={state.deadline_date}
              onChange={(e) => update("deadline_date", e.target.value)}
              aria-invalid={!!err("deadline_date")}
              aria-describedby={describedBy("deadline_date")}
            />
            <FieldError id="deadline_date" message={err("deadline_date")} />
          </div>
        )}
      </fieldset>

      {/* 9. Формат */}
      <fieldset id="field-formats" aria-describedby="hint-formats">
        <legend className="field-label">
          {f.formats.label} <Opt />
        </legend>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((fmt) => {
            const selected = state.formats.includes(fmt);
            return (
              <button
                key={fmt}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleFormat(fmt)}
                className={chipClass(selected)}
              >
                {selected && <CheckMark />}
                {f.formats.options[fmt]}
              </button>
            );
          })}
        </div>
        <p id="hint-formats" className="field-hint">
          {f.formats.hint}
        </p>
      </fieldset>

      {/* 10. Требования */}
      <div>
        <label htmlFor="field-content_requirements" className="field-label">
          {f.content.label} <Opt />
        </label>
        <textarea
          id="field-content_requirements"
          rows={3}
          maxLength={1000}
          className="input resize-y"
          placeholder={f.content.placeholder}
          value={state.content_requirements}
          onChange={(e) => update("content_requirements", e.target.value)}
        />
        <FieldError id="content_requirements" message={err("content_requirements")} />
      </div>

      {/* 11. Нравятся */}
      <div>
        <label htmlFor="field-liked_creators" className="field-label">
          {f.liked.label} <Opt />
        </label>
        <textarea
          id="field-liked_creators"
          rows={2}
          maxLength={1000}
          className="input resize-y"
          placeholder={f.liked.placeholder}
          value={state.liked_creators}
          onChange={(e) => update("liked_creators", e.target.value)}
        />
        <FieldError id="liked_creators" message={err("liked_creators")} />
      </div>

      {/* 12. Контакт */}
      <div>
        <label htmlFor="field-contact" className="field-label">
          {f.contact.label} <Req />
        </label>
        <input
          id="field-contact"
          type="text"
          inputMode="text"
          autoComplete="tel"
          className={`input ${err("contact") ? "input-invalid" : ""}`}
          placeholder={f.contact.placeholder}
          maxLength={100}
          value={state.contact}
          onChange={(e) => update("contact", e.target.value)}
          aria-invalid={!!err("contact")}
          aria-describedby={describedBy("contact", true)}
        />
        <p id="hint-contact" className="field-hint">
          {f.contact.hint}
        </p>
        <FieldError id="contact" message={err("contact")} />
      </div>

      {/* honeypot: скрыт от людей и скринридеров */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">{f.honeypot}</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={state.website}
          onChange={(e) => setState((s) => ({ ...s, website: e.target.value }))}
        />
      </div>

      {/* 13. Согласие */}
      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="field-consent"
            type="checkbox"
            checked={state.consent}
            onChange={(e) => update("consent", e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-[#D6342A]"
            aria-invalid={!!err("consent")}
            aria-describedby={describedBy("consent")}
          />
          <span className="text-base leading-snug text-ink">
            {f.consent.before}
            <Link href="/terms" target="_blank" className="font-semibold text-accent-ink underline underline-offset-2">
              {f.consent.link}
            </Link>{" "}
            <Req />
          </span>
        </label>
        <FieldError id="consent" message={err("consent")} />
      </div>

      <div className="space-y-3 pt-1">
        {formError && (
          <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-ink">
            {formError}
          </p>
        )}
        <button type="submit" className="btn-primary w-full text-lg sm:w-auto sm:px-10" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? f.submitting : f.submit}
        </button>
        <p className="text-sm text-ink-faint">{f.note}</p>
      </div>
    </form>
  );
}

function chipClass(selected: boolean) {
  return [
    "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-40",
    selected
      ? "border-ink bg-ink text-white"
      : "border-line bg-white text-ink hover:border-ink/40",
  ].join(" ");
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Req() {
  return (
    <span className="text-accent-ink" aria-label={f.required}>
      *
    </span>
  );
}

function Opt() {
  return <span className="text-sm font-medium text-ink-faint">({f.optional})</span>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`error-${id}`} className="field-error" role="alert">
      {message}
    </p>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function NumberBox(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <div className="relative">
      <label htmlFor={`field-${props.id}`} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
        {props.label}
      </label>
      <input
        id={`field-${props.id}`}
        type="text"
        inputMode="numeric"
        maxLength={2}
        className={`input pl-12 ${props.invalid ? "input-invalid" : ""}`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, ""))}
        aria-invalid={props.invalid}
        aria-describedby={props.describedBy}
      />
    </div>
  );
}

// A8, Версия B: ползунок бюджета с двумя ручками (замечание T4 про поля «от и до»).
// Ручки синхронизированы с полями ввода ниже, точную сумму можно вписать вручную.
const B_MIN = 0;
const B_MAX = 500_000;
const B_STEP = 5_000;
const B_DEFAULT: [number, number] = [30_000, 100_000];

function BudgetSlider(props: { min: string; max: string; onChange: (lo: string, hi: string) => void }) {
  const clamp = (n: number) => Math.min(B_MAX, Math.max(B_MIN, n));
  const lo = clamp(parseAmount(props.min) ?? B_DEFAULT[0]);
  const hi = clamp(parseAmount(props.max) ?? B_DEFAULT[1]);
  const fmt = (n: number) => formatThousands(n).replace(/ /g, "\u00a0");
  const pct = (n: number) => ((n - B_MIN) / (B_MAX - B_MIN)) * 100;
  const set = (a: number, b: number) => props.onChange(fmt(a), fmt(b));
  return (
    <div className="sm:max-w-md">
      <div className="mb-2 flex items-baseline justify-between text-lg font-extrabold tabular-nums" aria-hidden="true">
        <span>{fmt(lo)} ₸</span>
        <span className="text-ink-faint">—</span>
        <span>
          {fmt(hi)}
          {hi >= B_MAX ? "+" : ""} ₸
        </span>
      </div>
      <div className="budget-range relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent-strong"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          aria-label={f.budget.sliderMin}
          min={B_MIN}
          max={B_MAX}
          step={B_STEP}
          value={lo}
          onChange={(e) => set(Math.min(Number(e.target.value), hi - B_STEP), hi)}
          className="absolute inset-0 w-full"
        />
        <input
          type="range"
          aria-label={f.budget.sliderMax}
          min={B_MIN}
          max={B_MAX}
          step={B_STEP}
          value={hi}
          onChange={(e) => set(lo, Math.max(Number(e.target.value), lo + B_STEP))}
          className="absolute inset-0 w-full"
        />
      </div>
    </div>
  );
}

function MoneyBox(props: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  return (
    <div className="relative">
      <label htmlFor={`field-${props.id}`} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
        {props.label}
      </label>
      <input
        id={`field-${props.id}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={11}
        placeholder={props.placeholder}
        className={`input pl-12 ${props.invalid ? "input-invalid" : ""}`}
        value={props.value}
        onChange={(e) => {
          const n = parseAmount(e.target.value);
          props.onChange(n === null ? "" : formatThousands(n).replace(/ /g, " "));
        }}
        aria-invalid={props.invalid}
        aria-describedby={props.describedBy}
      />
    </div>
  );
}

function RadioCard(props: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  describedBy?: string;
}) {
  return (
    <label className="relative block cursor-pointer">
      <input
        type="radio"
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={props.onChange}
        className="peer sr-only"
        aria-describedby={props.describedBy}
      />
      <span className="flex min-h-[52px] items-center gap-3 rounded-card border-2 border-line bg-white px-4 py-3 font-semibold text-ink transition-colors peer-checked:border-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent-strong peer-focus-visible:ring-offset-2">
        <i
          aria-hidden
          className={`h-5 w-5 shrink-0 rounded-full bg-white transition-all ${
            props.checked ? "border-[6px] border-ink" : "border-2 border-ink-faint"
          }`}
        />
        {props.label}
      </span>
    </label>
  );
}
