// Exporta todos os dados do SQLite local para um JSON unico, em ordem segura
// de FK, para depois importar no Postgres da VPS (ver scripts/restore-db.ts).
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const db = new PrismaClient({ adapter });

// Ordem de exportacao respeita dependencias de FK (pais antes dos filhos).
const MODELS_IN_ORDER = [
  "user",
  "category",
  "exchangeRate",
  "card",
  "purchase",
  "purchaseParticipant",
  "purchaseInstallment",
  "fixedExpense",
  "fixedExpenseInstallment",
] as const;

async function main() {
  const data: Record<string, unknown[]> = {};

  for (const model of MODELS_IN_ORDER) {
    // @ts-expect-error -- acesso dinamico ao client por nome do model
    data[model] = await db[model].findMany();
    console.log(`  ${model}: ${data[model].length} registros`);
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  const outDir = join(process.cwd(), "backups");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `data-export-${timestamp}.json`);

  writeFileSync(
    outPath,
    JSON.stringify({ exportedAt: new Date().toISOString(), modelsInOrder: MODELS_IN_ORDER, data }, null, 2),
    "utf-8",
  );

  console.log(`\nBackup salvo em: ${outPath}`);
}

main()
  .catch((err) => {
    console.error("Falha ao gerar backup:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
