// Importa um JSON gerado por scripts/backup-db.ts para o Postgres de destino
// (DATABASE_URL). Mantem os mesmos ids (cuid) do export para preservar as
// relacoes. Uso: DATABASE_URL=postgresql://... npx tsx scripts/restore-db.ts backups/data-export-XXXX.json
import { PrismaClient } from "../src/generated/prisma-production/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Uso: npx tsx scripts/restore-db.ts <caminho-do-backup.json>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

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
  const backup = JSON.parse(readFileSync(filePath, "utf-8"));

  for (const model of MODELS_IN_ORDER) {
    const rows: Record<string, unknown>[] = backup.data[model] ?? [];
    if (rows.length === 0) {
      console.log(`  ${model}: 0 registros, pulando`);
      continue;
    }

    if (model === "user") {
      // User.lastUsedCardId -> Card e Card.ownerUserId -> User formam uma
      // dependencia circular: insere User sem esse campo, preenche no final.
      const rowsWithoutCard = rows.map(({ lastUsedCardId, ...rest }) => rest);
      // @ts-expect-error -- rows vem de JSON generico (unknown), formato ja validado pelo backup-db.ts
      const result = await db.user.createMany({ data: rowsWithoutCard });
      console.log(`  user: ${result.count} registros importados`);
      continue;
    }

    // @ts-expect-error -- acesso dinamico ao client por nome do model
    const result = await db[model].createMany({ data: rows });
    console.log(`  ${model}: ${result.count} registros importados`);
  }

  const usersWithCard = (backup.data.user ?? []).filter(
    (u: Record<string, unknown>) => u.lastUsedCardId,
  );
  for (const user of usersWithCard) {
    await db.user.update({
      where: { id: user.id as string },
      data: { lastUsedCardId: user.lastUsedCardId as string },
    });
  }
  if (usersWithCard.length > 0) {
    console.log(`  user: ${usersWithCard.length} lastUsedCardId preenchidos`);
  }

  console.log("\nRestore concluido.");
}

main()
  .catch((err) => {
    console.error("Falha ao restaurar backup:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
