// Серверные настройки из окружения.
export function showTestData(): boolean {
  return process.env.SHOW_TEST_DATA === "true";
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
