import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSession, type SessionData } from "@/lib/session";
import { db } from "@/lib/db";

export async function requireUser(): Promise<SessionData> {
  const session = await getSession();

  if (!session.userId) {
    redirect("/login");
  }

  return { userId: session.userId, username: session.username };
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Gastos fixos (FixedExpense) ainda usam o modelo binario "eu vs a outra
// pessoa" (fora do escopo da divisao de compra entre N participantes) -
// mantido tal como esta, so pros fluxos de fixed-expenses/*.
export async function getOtherUser(
  currentUserId: string
): Promise<{ id: string; name: string } | null> {
  return db.user.findFirst({
    where: { id: { not: currentUserId } },
    select: { id: true, name: true },
  });
}

// Todos os demais usuarios cadastrados, candidatos a participante de uma
// divisao de compra (Purchase agora suporta N participantes, nao so 1).
export async function listParticipantCandidates(
  currentUserId: string
): Promise<{ id: string; name: string }[]> {
  return db.user.findMany({
    where: { id: { not: currentUserId } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
