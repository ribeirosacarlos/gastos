// Prisma config para o schema de PRODUCAO (Postgres). Usado via --config
// nos comandos que tocam prisma/schema.production.prisma - ver
// prisma.config.ts para o config do dev local (SQLite).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.production.prisma",
  migrations: {
    path: "prisma/migrations-production",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
