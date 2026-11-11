"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/components/creator/ui";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await postJson("/api/admin/login", { password });
    if (r.ok) router.refresh();
    else setMsg(String(r.data.error ?? "Неверный пароль"));
  }
  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">Админка AdMatch</h1>
      <input className="input" type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      {msg && <p className="field-error">{msg}</p>}
      <button className="btn-primary w-full">Войти</button>
    </form>
  );
}
