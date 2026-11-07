"use client";
// Клиентская аналитика: session_id, landing_ts, UTM и отправка событий батчем в /api/events.
import type { EventName } from "./niches";

const KEYS = {
  sid: "am_sid",
  landing: "am_landing_ts",
  utm: "am_utm",
  order: "am_contact_order",
  draft: "am_form_draft",
  contactFor: (requestId: string) => `am_contact:${requestId}`,
  viewed: (requestId: string) => `am_viewed:${requestId}`,
  recent: "am_recent_results",
};

// A9: «Мои подборки» без регистрации (замечания T1, T3 про личный кабинет). Хранится только на этом устройстве.
export interface RecentResult { id: string; product: string; at: string }
export function getRecentResults(): RecentResult[] {
  try {
    const v = JSON.parse(storageGet(KEYS.recent) || "[]");
    return Array.isArray(v) ? v.slice(0, 5) : [];
  } catch {
    return [];
  }
}
export function saveRecentResult(r: RecentResult): void {
  const list = [r, ...getRecentResults().filter((x) => x.id !== r.id)].slice(0, 5);
  storageSet(KEYS.recent, JSON.stringify(list));
}

const memory = new Map<string, string>();

export function storageGet(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    /* приватный режим / блокировка хранилища */
  }
  return memory.get(key) ?? null;
}

export function storageSet(key: string, value: string): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* игнорируем */
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface Utm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/** Вызывается на каждой странице: создаёт session_id и landing_ts при первом визите, запоминает UTM. */
export function initSession(): void {
  if (!storageGet(KEYS.sid)) storageSet(KEYS.sid, uuid());
  if (!storageGet(KEYS.landing)) storageSet(KEYS.landing, String(Date.now()));
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Utm = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 200);
    }
    if (Object.keys(utm).length) storageSet(KEYS.utm, JSON.stringify(utm));
  } catch {
    /* игнорируем */
  }
}

export function getSessionId(): string {
  let sid = storageGet(KEYS.sid);
  if (!sid) {
    sid = uuid();
    storageSet(KEYS.sid, sid);
  }
  return sid;
}

export function getUtm(): Utm {
  try {
    return JSON.parse(storageGet(KEYS.utm) ?? "{}") as Utm;
  } catch {
    return {};
  }
}

export function secondsFromLanding(): number {
  const ts = Number(storageGet(KEYS.landing));
  if (!ts) return 0;
  return Math.max(0, Math.round((Date.now() - ts) / 1000));
}

/** Порядок карточек в модалке «Связаться» — случайный, но один на сессию. */
export function getContactOrder(): "admatch_first" | "direct_first" {
  const key = `${KEYS.order}:${getSessionId()}`;
  const saved = storageGet(key);
  if (saved === "admatch_first" || saved === "direct_first") return saved;
  const order = Math.random() < 0.5 ? "admatch_first" : "direct_first";
  storageSet(key, order);
  return order;
}

// ─── черновик формы и контакт бизнеса (API контакт не отдаёт) ───────────────
export function saveDraft(draft: unknown): void {
  storageSet(KEYS.draft, JSON.stringify(draft));
}

export function loadDraft<T>(): T | null {
  try {
    const raw = storageGet(KEYS.draft);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveRequestContact(requestId: string, contact: string): void {
  storageSet(KEYS.contactFor(requestId), contact);
}

export function getRequestContact(requestId: string): string | null {
  return storageGet(KEYS.contactFor(requestId));
}

/** true только при первом показе подборки на этом устройстве. */
export function markResultsViewed(requestId: string): boolean {
  if (storageGet(KEYS.viewed(requestId))) return false;
  storageSet(KEYS.viewed(requestId), "1");
  return true;
}

// ─── очередь событий ────────────────────────────────────────────────────────
interface QueuedEvent {
  sessionId: string;
  requestId?: string | null;
  name: EventName;
  props: Record<string, unknown>;
}

const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function flush(useBeacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const batch = queue.splice(0, 50);
  const body = JSON.stringify(batch);
  try {
    if (useBeacon && navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      if (queue.length) flush(useBeacon);
      return;
    }
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* аналитика не должна ломать интерфейс */
  }
  if (queue.length) flush(useBeacon);
}

function listen(): void {
  if (listening) return;
  listening = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}

export function track(name: EventName, props: Record<string, unknown>, requestId?: string | null): void {
  if (typeof window === "undefined") return;
  listen();
  queue.push({ sessionId: getSessionId(), requestId: requestId ?? null, name, props });
  if (!timer) timer = setTimeout(() => flush(), 500);
}
