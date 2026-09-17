// Lista usuarios, reseta a senha de um deles, ou renomeia + reseta. Funciona
// tanto no SQLite local (padrao) quanto no Postgres de producao
// (DATABASE_PROVIDER=postgresql + DATABASE_URL apontando pro banco certo),
// via src/lib/db.ts.
// Uso:
//   npx tsx scripts/reset-password.ts                                  -> lista usuarios
//   npx tsx scripts/reset-password.ts <username> <novaSenha>            -> reseta a senha
//   npx tsx scripts/reset-password.ts <username> <novoUsername> <novaSenha> -> renomeia + reseta
import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    const users = await db.user.findMany({ select: { username: true, name: true } });
    console.log("Usuarios cadastrados:");
    for (const u of users) console.log(`  ${u.username}  (${u.name})`);
    console.log("\nPra resetar: npx tsx scripts/reset-password.ts <username> <novaSenha>");
    console.log("Pra renomear + resetar: npx tsx scripts/reset-password.ts <username> <novoUsername> <novaSenha>");
    return;
  }

  const [currentUsername, second, third] = args;
  const newUsername = third ? second : currentUsername;
  const newPassword = third ?? second;

  if (!newPassword) {
    console.error("Faltou a nova senha.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const user = await db.user.update({
    where: { username: currentUsername },
    data: { username: newUsername, passwordHash },
  });
  console.log(`Usuario atualizado: "${currentUsername}" -> "${user.username}", senha resetada.`);
}

main()
  .catch((err) => {
    console.error("Falha:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
