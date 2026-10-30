// Форматирование чисел и дат для интерфейса и уведомлений (ru-RU).
const NBSP = " ";

/** 45000 → «45 000» (неразрывные пробелы между разрядами). */
export function formatThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 45000 → «45 000 ₸». */
export function formatPrice(n: number): string {
  return `${formatThousands(n)}${NBSP}₸`;
}

function oneDecimal(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

/** 38200 → «38,2 тыс.», 1250000 → «1,3 млн», 950 → «950». */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${oneDecimal(n / 1_000_000)}${NBSP}млн`;
  if (n >= 1_000) return `${oneDecimal(n / 1_000)}${NBSP}тыс.`;
  return String(n);
}

/** 6.1 → «6,1%», 72 → «72%». */
export function formatPct(n: number): string {
  return `${oneDecimal(n)}%`;
}

/** Склонение: pluralRu(2, ["блогер", "блогера", "блогеров"]) → «блогера». */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «2026-10-15» → «15 октября 2026». */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Разбор ввода бюджета: «30 000» → 30000, пусто → null. */
export function parseAmount(s: string): number | null {
  const digits = s.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}
