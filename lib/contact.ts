// Распознавание контакта: телефон (WhatsApp) или @ник (Telegram).

export type ContactInfo =
  | { kind: "phone"; display: string; href: string }
  | { kind: "telegram"; display: string; href: string }
  | { kind: "other"; display: string; href: null };

const TG_HANDLE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

function phoneDigits(raw: string): string | null {
  if (!/^\+?[\d\s\-()]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("7")) digits = "7" + digits; // 7XX XXX XX XX
  return digits.length >= 11 && digits.length <= 13 ? digits : null;
}

function telegramHandle(raw: string): string | null {
  const s = raw.trim();
  const fromLink = s.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)\/?$/i);
  const handle = fromLink ? fromLink[1] : s.startsWith("@") ? s.slice(1) : null;
  return handle && TG_HANDLE.test(handle) ? handle : null;
}

/** Валидно для поля «Ваш контакт для связи»: телефон или @ник/ссылка t.me. */
export function isValidContact(raw: string): boolean {
  const s = raw.trim();
  return phoneDigits(s) !== null || telegramHandle(s) !== null;
}

export function parseContact(raw: string): ContactInfo {
  const s = raw.trim();
  const digits = phoneDigits(s);
  if (digits) return { kind: "phone", display: s, href: `https://wa.me/${digits}` };
  const handle = telegramHandle(s);
  if (handle) return { kind: "telegram", display: `@${handle}`, href: `https://t.me/${handle}` };
  return { kind: "other", display: s, href: null };
}
