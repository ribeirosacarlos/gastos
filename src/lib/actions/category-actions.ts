"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  categorySchema,
  type CategoryInput,
} from "@/lib/validation/schemas";

export interface CategoryOption {
  id: string;
  name: string;
}

// Compartilhadas entre os dois usuarios (sem ownerUserId) - mesmo escopo da
// lista fixa que essa tabela substitui (Story 1.13 -> 1.15).
export async function listCategories(): Promise<CategoryOption[]> {
  await requireUser();

  return db.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type CreateCategoryResult =
  | { error: string; category?: never }
  | { error?: never; category: CategoryOption };

// Idempotente por nome (case-insensitive): tanto a tela de cadastro quanto o
// "+ adicionar" inline do combobox chamam essa mesma action, entao evitar
// duplicata aqui (em vez de bloquear com erro) mantem as duas superficies
// consistentes sem atrito extra pro usuario.
export async function createCategory(
  input: CategoryInput
): Promise<CreateCategoryResult> {
  await requireUser();

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const name = parsed.data.name.trim();

  const existing = await db.category.findFirst({
    where: { isActive: true, name: { equals: name } },
  });
  if (existing) {
    return { category: { id: existing.id, name: existing.name } };
  }

  const category = await db.category.create({ data: { name } });

  revalidatePath("/categories");
  return { category: { id: category.id, name: category.name } };
}

export type UpdateCategoryResult = { error?: string };

export async function updateCategory(
  categoryId: string,
  input: CategoryInput
): Promise<UpdateCategoryResult> {
  await requireUser();

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return { error: "Categoria não encontrada." };
  }

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await db.category.update({
    where: { id: categoryId },
    data: { name: parsed.data.name.trim() },
  });

  revalidatePath("/categories");
  return {};
}

export type ArchiveCategoryResult = { error?: string };

export async function archiveCategory(
  categoryId: string
): Promise<ArchiveCategoryResult> {
  await requireUser();

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return { error: "Categoria não encontrada." };
  }

  // Sem cascata: compras e gastos fixos ja lancados guardam o id da
  // categoria direto (string livre, sem FK) e continuam exibindo o nome
  // atual normalmente mesmo depois de desativada - so some das opcoes de
  // selecao daqui pra frente (mesmo padrao de Card.isActive).
  await db.category.update({
    where: { id: categoryId },
    data: { isActive: false },
  });

  revalidatePath("/categories");
  return {};
}
