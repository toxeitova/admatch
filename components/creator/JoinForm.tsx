"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, NichePicker, postJson } from "./ui";

export function JoinForm() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "", handle: "", display_name: "", contact: "", tiktok_url: "", niches: [] as string[], consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: k === "consent" ? e.target.checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await postJson("/api/creator/register", f);
    setBusy(false);
    if (r.ok) return router.push("/creator?welcome=1");
    setErrors((r.data.fields as Record<string, string>) ?? {});
    setMsg(typeof r.data.error === "string" && r.data.error !== "validation" ? r.data.error : "Проверьте поля формы");
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-5 sm:p-7" noValidate>
      <Field label="Ник в Instagram" hint="Например: @almaty_foodie" error={errors.handle}>
        <input className="input" value={f.handle} onChange={set("handle")} placeholder="@ваш_ник" autoComplete="off" />
      </Field>
      <Field label="Имя" error={errors.display_name}>
        <input className="input" value={f.display_name} onChange={set("display_name")} autoComplete="name" />
      </Field>
      <NichePicker value={f.niches} onChange={(niches) => setF({ ...f, niches })} error={errors.niches} />
      <Field label="Телефон или Telegram для связи" hint="Не показываем бизнесам. Нужен, чтобы мы могли предложить вам рекламу." error={errors.contact}>
        <input className="input" value={f.contact} onChange={set("contact")} placeholder="+7 7XX XXX XX XX или @telegram" />
      </Field>
      <Field label="TikTok (необязательно)" error={errors.tiktok_url}>
        <input className="input" value={f.tiktok_url} onChange={set("tiktok_url")} placeholder="https://tiktok.com/@..." />
      </Field>
      <Field label="Email" error={errors.email}>
        <input className="input" type="email" value={f.email} onChange={set("email")} autoComplete="email" />
      </Field>
      <Field label="Пароль" hint="Минимум 8 символов" error={errors.password}>
        <input className="input" type="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={f.consent} onChange={set("consent")} />
        <span className="text-sm leading-relaxed">
          Согласен(на), что AdMatch покажет мой профиль, статистику и цены бизнесам, и с{" "}
          <Link href="/terms" target="_blank" className="font-semibold underline">условиями сервиса</Link>
        </span>
      </label>
      {errors.consent && <p className="field-error">{errors.consent}</p>}
      {msg && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-ink">{msg}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Создаём кабинет…" : "Создать кабинет"}</button>
      <p className="text-center text-sm text-ink-muted">
        Уже есть кабинет? <Link href="/creator/login" className="font-bold text-accent-ink underline">Войти</Link>
      </p>
    </form>
  );
}
