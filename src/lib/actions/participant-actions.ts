"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  createParticipantSchema,
  type CreateParticipantInput,
} from "@/lib/validation/schemas";

export interface CreatedParticipant {
  id: string;
  name: string;
  username: string;
}

export type CreateParticipantResult =
  | { error: string }
  | { participant: CreatedParticipant };

// Slug de username a partir do nome: minusculo, sem acento, so [a-z0-9].
// Nome sem nenhum caractere aproveitavel (ex: so emoji) cai no fallback.
function usernameSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return slug || "participante";
}

// Gera um username unico a partir do nome, tentando o slug puro primeiro e
// acrescentando sufixo numerico incremental em caso de colisao (Req-04).
async function generateUniqueUsername(name: string): Promise<string> {
  const base = usernameSlug(name);
  let candidate = base;
  let suffix = 2;

  while (await db.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

// Cria um usuario real (com login) pra servir de participante de uma
// divisao de compra - decisao de produto aceita explicitamente: senha
// previsivel (<username>123), app pessoal sem dado sensivel de terceiro.
// Nao "corrigir" pra senha aleatoria (ver constitution.md e plan.md).
export async function createParticipant(
  input: CreateParticipantInput
): Promise<CreateParticipantResult> {
  await requireUser();

  const parsed = createParticipantSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name } = parsed.data;
  const username = await generateUniqueUsername(name);
  const passwordHash = await bcrypt.hash(`${username}123`, 10);

  const user = await db.user.create({
    data: { name, username, passwordHash },
    select: { id: true, name: true, username: true },
  });

  return { participant: user };
}
