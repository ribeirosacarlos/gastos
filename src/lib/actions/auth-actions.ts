"use server";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";

export type LoginResult = { error?: string };

export async function login(values: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const user = await db.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user) {
    return { error: "Usuário ou senha inválidos." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Usuário ou senha inválidos." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();

  return {};
}
