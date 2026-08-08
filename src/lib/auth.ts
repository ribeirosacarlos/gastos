import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSession, type SessionData } from "@/lib/session";

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
