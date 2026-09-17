import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  username: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variavel de ambiente ${name} nao definida. Configure-a no .env (ver .env.example).`
    );
  }
  return value;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: requiredEnv("SESSION_SECRET"),
    cookieName: "gastos_session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      // Cookie "Secure" e ignorado pelo navegador fora de HTTPS. Deploy
      // atual roda sem TLS/dominio ainda - COOKIE_SECURE=false permite isso
      // sem perder o default seguro assim que houver TLS na frente.
      secure: process.env.COOKIE_SECURE === "false" ? false : process.env.NODE_ENV === "production",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}
