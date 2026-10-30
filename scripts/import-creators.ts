// Импорт блогеров из CSV с upsert по handle.
// Запуск: npm run import -- path/to/creators.csv
// Колонки = поля таблицы creators (см. creators_template.csv), niches — через «;».
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { adminClient } from "./_db";
import { parseCreatorRow } from "../lib/creatorCsv";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Укажите файл: npm run import -- creators.csv");
    process.exit(1);
  }
  const records = parse(readFileSync(file, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: false,
  }) as Record<string, string>[];

  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  records.forEach((r, i) => {
    try {
      rows.push(parseCreatorRow(r));
    } catch (e) {
      errors.push(`строка ${i + 2} (${r.handle || "без handle"}): ${(e as Error).message}`);
    }
  });

  if (errors.length) {
    console.error(`Найдены ошибки, ничего не загружено:\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }

  const { error } = await adminClient().from("creators").upsert(rows, { onConflict: "handle" });
  if (error) throw error;
  console.log(`Готово: загружено/обновлено ${rows.length} блогеров.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
