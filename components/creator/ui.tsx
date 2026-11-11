"use client";
// Небольшие общие элементы форм кабинета.
import { NICHES } from "@/lib/niches";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint block">{hint}</span>}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}

export function NichePicker({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
  return (
    <fieldset>
      <legend className="field-label">Ваши ниши (до 3)</legend>
      <div className="flex flex-wrap gap-2">
        {NICHES.map((n) => {
          const on = value.includes(n);
          const disabled = !on && value.length >= 3;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(on ? value.filter((x) => x !== n) : [...value, n])}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                on ? "border-accent-strong bg-accent-soft text-accent-ink" : "border-line bg-white text-ink-muted hover:border-ink/30"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}

export const toInt = (s: string): number | null => {
  const d = s.replace(/\D/g, "");
  return d ? Number(d) : null;
};

export async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok && data.ok === true, data };
  } catch {
    return { ok: false, data: { error: "Нет связи. Попробуйте ещё раз." } };
  }
}
