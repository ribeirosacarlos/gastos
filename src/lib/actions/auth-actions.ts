"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";
import { isLocked, recordFailure, recordSuccess } from "@/lib/rate-limit";

export type LoginResult = { error?: string };

// Chave por usuario (funciona mesmo sem proxy reverso na frente, ja que o IP
// real do cliente so chega em x-forwarded-for quando ha proxy). Some o IP
// quando disponivel para nao punir outros usuarios atras do mesmo IP.
async function rateLimitKey(username: string): Promise<string> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "";
  return `login:${username.toLowerCase()}:${ip}`;
}

export async function login(values: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const key = await rateLimitKey(parsed.data.username);
  const lockedUntil = isLocked(key);
  if (lockedUntil) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
    return { error: `Muitas tentativas. Tente novamente em ${minutes} min.` };
  }

  const user = await db.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user) {
    recordFailure(key);
    return { error: "Usuário ou senha inválidos." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    recordFailure(key);
    return { error: "Usuário ou senha inválidos." };
  }

  recordSuccess(key);
  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();

  return {};
}
