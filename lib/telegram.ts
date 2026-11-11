// Уведомления команде через Telegram Bot API (только sendMessage).
// Ошибки не пробрасываются: уведомление не должно ломать ответ пользователю.
import { copy } from "./copy.ru";
import { formatDate, formatThousands } from "./format";
import { siteUrl } from "./env";

const resultsUrl = (requestId: string) => `${siteUrl()}/results/${requestId}`;
const amount = (n: number | null | undefined) => (n == null ? "?" : formatThousands(n).replace(/ /g, " "));

export function newRequestMessage(r: {
  id: string;
  product: string;
  niches: string[];
  budget_min: number;
  budget_max: number;
  contact: string;
  found: number;
}): string {
  return [
    "🆕 Новая заявка",
    r.product,
    `Ниши: ${r.niches.join(", ")}`,
    `Бюджет: ${amount(r.budget_min)}–${amount(r.budget_max)} ₸`,
    `Подобрано: ${r.found}`,
    `Контакт: ${r.contact}`,
    resultsUrl(r.id),
  ].join("\n");
}

/** Детали заявки, которые нужны команде для ручной работы. */
export interface RequestDetails {
  goal?: string | null;
  deadline?: string | null;
  formats?: string[] | null;
  content_requirements?: string | null;
  liked_creators?: string | null;
}

const f = copy.form;

/** Строки с деталями заявки; пустые поля пропускаются. */
export function detailLines(d: RequestDetails = {}): string[] {
  const lines: string[] = [];
  if (d.goal && d.goal in f.goal.options) lines.push(`Цель: ${f.goal.options[d.goal as keyof typeof f.goal.options]}`);
  if (d.deadline) {
    const label =
      d.deadline in f.deadline.options
        ? f.deadline.options[d.deadline as keyof typeof f.deadline.options]
        : formatDate(d.deadline);
    lines.push(`Сроки: ${label}`);
  }
  if (d.formats) {
    const names = d.formats.map((x) => f.formats.options[x as keyof typeof f.formats.options] ?? x);
    lines.push(`Форматы: ${names.length ? names.join(", ") : "любые"}`);
  }
  if (d.content_requirements?.trim()) lines.push(`Требования к контенту: ${d.content_requirements.trim()}`);
  if (d.liked_creators?.trim()) lines.push(`Нравятся блогеры: ${d.liked_creators.trim()}`);
  return lines;
}

export function admatchDealMessage(r: {
  requestId: string;
  product: string;
  handle: string;
  contact: string;
  details?: RequestDetails;
}): string {
  return [
    "💰 СДЕЛКА через AdMatch",
    `Бизнес: ${r.product}`,
    `Блогер: @${r.handle}`,
    `Контакт бизнеса: ${r.contact}`,
    "Проверить, свободен ли, и ответить за 24 ч",
    ...detailLines(r.details),
    resultsUrl(r.requestId),
  ].join("\n");
}

export function directContactMessage(r: { product: string; handle: string }): string {
  return `➡️ Прямой контакт: ${r.product} → @${r.handle}`;
}

export function manualRequestMessage(r: {
  requestId: string;
  product: string;
  found: number;
  contact: string;
  details?: RequestDetails;
}): string {
  return [
    "🔍 РУЧНОЙ ПОДБОР",
    r.product,
    `Найдено: ${r.found}`,
    `Контакт: ${r.contact}`,
    ...detailLines(r.details),
    resultsUrl(r.requestId),
  ].join("\n");
}

export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID не заданы — уведомление пропущено");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[telegram] sendMessage error:", e);
    return false;
  }
}

// ─── Кабинет блогера ───────────────────────────────────────────────────
const adminUrl = () => `${siteUrl()}/admin`;

export function creatorRegisteredMessage(c: { handle: string; name: string; niches: string[] }): string {
  return [`🆕 Новый блогер зарегистрировался`, `@${c.handle} · ${c.name}`, `Ниши: ${c.niches.join(", ")}`].join("\n");
}

export function statsSubmittedMessage(c: { handle: string; followers: number; screenshots: number }): string {
  return [
    `📊 Аналитика на проверку`,
    `@${c.handle}: ${c.followers.toLocaleString("ru-RU")} подписчиков, скриншотов: ${c.screenshots}`,
    `Проверить: ${adminUrl()}`,
  ].join("\n");
}

export function availabilityChangedMessage(c: { handle: string; before: string[]; after: string[] }): string {
  return [
    `📅 @${c.handle} изменил свободные даты`,
    `Было: ${c.before.length ? c.before.join("; ") : "не указаны"}`,
    `Стало: ${c.after.length ? c.after.join("; ") : "нет свободных дат"}`,
  ].join("\n");
}

export function pricesChangedMessage(c: { handle: string; lines: string[] }): string {
  return [`💸 @${c.handle} обновил цены`, ...c.lines].join("\n");
}
