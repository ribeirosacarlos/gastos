"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  cardSchema,
  updateCardSchema,
  type CardInput,
  type UpdateCardInput,
} from "@/lib/validation/schemas";

export type CreateCardResult = { error?: string };

export async function createCard(input: CardInput): Promise<CreateCardResult> {
  const user = await requireUser();

  const parsed = cardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await db.card.create({
    data: {
      ...parsed.data,
      ownerUserId: user.userId,
    },
  });

  revalidatePath("/cards");
  return {};
}

export type UpdateCardResult = { error?: string };

export async function updateCard(
  cardId: string,
  input: UpdateCardInput
): Promise<UpdateCardResult> {
  const user = await requireUser();

  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card || card.ownerUserId !== user.userId) {
    return { error: "Cartão não encontrado." };
  }

  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await db.card.update({
    where: { id: cardId },
    data: parsed.data,
  });

  revalidatePath("/cards");
  revalidatePath(`/cards/${cardId}`);
  return {};
}

export type ArchiveCardResult = { error?: string };

export async function archiveCard(cardId: string): Promise<ArchiveCardResult> {
  const user = await requireUser();

  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card || card.ownerUserId !== user.userId) {
    return { error: "Cartão não encontrado." };
  }

  await db.card.update({
    where: { id: cardId },
    data: { isActive: false },
  });

  revalidatePath("/cards");
  revalidatePath(`/cards/${cardId}`);
  return {};
}
