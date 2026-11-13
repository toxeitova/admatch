"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { copy } from "@/lib/copy.ru";
import { supportWhatsAppUrl } from "@/lib/env";
import { Field, postJson } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await postJson("/api/creator/login", { email, password });
    setBusy(false);
    if (r.ok) return router.push("/creator");
    setMsg(typeof r.data.error === "string" ? r.data.error : "Не получилось войти");
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-5 sm:p-7">
      <Field label="Email">
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      <Field label="Пароль">
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </Field>
      {msg && <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-ink">{msg}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Входим…" : "Войти"}</button>
      <p className="text-center text-sm text-ink-muted">
        Забыли пароль?{" "}
        <a href={supportWhatsAppUrl(copy.support.whatsapp, "Здравствуйте! Забыл(а) пароль от кабинета блогера AdMatch, мой ник: @")} target="_blank" rel="noopener noreferrer" className="font-bold text-accent-ink underline">
          Напишите нам в WhatsApp
        </a>
      </p>
      <p className="text-center text-sm text-ink-muted">
        Нет кабинета? <Link href="/creator/join" className="font-bold text-accent-ink underline">Зарегистрироваться</Link>
      </p>
    </form>
  );
}
