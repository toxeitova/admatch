// Свободные даты блогера: «6–10, 15–20, 29, 30 ноября».
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** days: ISO-даты YYYY-MM-DD. Возвращает строки по месяцам. */
export function formatAvailability(days: string[]): string[] {
  const sorted = [...new Set(days)].sort();
  const byMonth = new Map<string, number[]>();
  for (const d of sorted) {
    const key = d.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), Number(d.slice(8, 10))]);
  }
  const out: string[] = [];
  for (const [key, nums] of byMonth) {
    const parts: string[] = [];
    let start = nums[0];
    let prev = nums[0];
    for (const n of [...nums.slice(1), Infinity]) {
      if (n === prev + 1) {
        prev = n;
        continue;
      }
      parts.push(prev - start >= 2 ? `${start}–${prev}` : start === prev ? `${start}` : `${start}, ${prev}`);
      start = prev = n;
    }
    out.push(`${parts.join(", ")} ${MONTHS_GEN[Number(key.slice(5, 7)) - 1]}`);
  }
  return out;
}

export function todayIsoAlmaty(now = new Date()): string {
  return new Date(now.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);
}
