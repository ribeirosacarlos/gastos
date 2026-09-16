import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient as PrismaClientProduction } from "@/generated/prisma-production/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Producao usa Postgres (schema.production.prisma); dev local usa SQLite.
  // Os dois schemas sao identicos campo a campo, entao o cast e seguro.
  if (process.env.DATABASE_PROVIDER === "postgresql") {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClientProduction({ adapter }) as unknown as PrismaClient;
  }
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
