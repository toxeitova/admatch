// Загружает 15 тестовых блогеров (is_test=true). Повторный запуск обновляет их по handle.
// Запуск: npm run seed
import { adminClient } from "./_db";
import { testCreatorRows } from "../data/test-creators";

async function main() {
  const db = adminClient();
  const rows = testCreatorRows();
  const { error } = await db.from("creators").upsert(rows, { onConflict: "handle" });
  if (error) throw error;
  console.log(`Готово: ${rows.length} тестовых блогеров (is_test=true).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
