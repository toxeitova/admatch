// Ссылки из данных пользователей показываем только если это обычный https-адрес (не javascript: и т.п.).
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const TIKTOK_URL = /^https:\/\/(www\.)?tiktok\.com\/@[A-Za-z0-9._]{2,40}\/?$/;
