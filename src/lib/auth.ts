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

// App tem só 2 usuários fixos (ver plano) - "a outra pessoa" é sempre
// não-ambíguo. Usado pra mostrar o nome de quem uma compra/gasto
// compartilhado é vinculado, tanto no form quanto nas listagens.
export async function getOtherUser(
  currentUserId: string
): Promise<{ id: string; name: string } | null> {
  return db.user.findFirst({
    where: { id: { not: currentUserId } },
    select: { id: true, name: true },
  });
}
