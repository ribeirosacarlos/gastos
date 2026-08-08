import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: requiredEnv("DATABASE_URL"),
});
const prisma = new PrismaClient({ adapter });

type SeedUser = {
  username: string;
  password: string;
  name: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variavel de ambiente ${name} nao definida. Configure-a no .env antes de rodar o seed (ver .env.example).`
    );
  }
  return value;
}

function loadSeedUsers(): [SeedUser, SeedUser] {
  return [
    {
      username: requiredEnv("SEED_USER1_USERNAME"),
      password: requiredEnv("SEED_USER1_PASSWORD"),
      name: requiredEnv("SEED_USER1_NAME"),
    },
    {
      username: requiredEnv("SEED_USER2_USERNAME"),
      password: requiredEnv("SEED_USER2_PASSWORD"),
      name: requiredEnv("SEED_USER2_NAME"),
    },
  ];
}

async function upsertUser(user: SeedUser) {
  const passwordHash = await bcrypt.hash(user.password, 10);

  return prisma.user.upsert({
    where: { username: user.username },
    update: { name: user.name, passwordHash },
    create: {
      username: user.username,
      name: user.name,
      passwordHash,
    },
  });
}

async function main() {
  const [user1, user2] = loadSeedUsers();

  const created = await Promise.all([upsertUser(user1), upsertUser(user2)]);

  console.log(
    `Seed concluido: ${created.map((u) => u.username).join(", ")}`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
