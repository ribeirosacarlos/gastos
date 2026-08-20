"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { firstInvoiceMonth, generateInstallmentMonths } from "@/lib/dates";
import { splitValue } from "@/lib/money";
import {
  purchaseSchema,
  updatePurchaseSchema,
  type PurchaseInput,
  type UpdatePurchaseInput,
} from "@/lib/validation/schemas";

// Valida additionalParticipantUserIds (dedupe, sem o proprio dono, todos
// devem existir) e retorna a lista completa de participantes (dono
// sempre primeiro - splitAmongParticipants depende dessa ordem pra
// atribuir o resto dos centavos deterministicamente). Usado por
// createPurchase e updatePurchase.
async function resolveParticipantUserIds(
  ownerUserId: string,
  additionalParticipantUserIds: string[]
): Promise<{ error: string } | { participantUserIds: string[] }> {
  const additional = Array.from(new Set(additionalParticipantUserIds));

  if (additional.includes(ownerUserId)) {
    return { error: "Você já é participante por padrão da própria compra." };
  }

  if (additional.length > 0) {
    const existingCount = await db.user.count({
      where: { id: { in: additional } },
    });
    if (existingCount !== additional.length) {
      return { error: "Participante inválido." };
    }
  }

  return { participantUserIds: [ownerUserId, ...additional] };
}

export type CreatePurchaseResult = { error?: string };

export async function createPurchase(
  input: PurchaseInput
): Promise<CreatePurchaseResult> {
  const user = await requireUser();

  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const {
    cardId,
    description,
    totalCents,
    purchaseDate,
    installmentsCount,
    additionalParticipantUserIds,
    category,
  } = parsed.data;

  const [card, categoryRecord] = await Promise.all([
    db.card.findUnique({ where: { id: cardId } }),
    db.category.findUnique({ where: { id: category } }),
  ]);
  if (!card || card.ownerUserId !== user.userId) {
    return { error: "Cartão inválido." };
  }
  if (!categoryRecord) {
    return { error: "Categoria inválida." };
  }

  const participants = await resolveParticipantUserIds(
    user.userId,
    additionalParticipantUserIds
  );
  if ("error" in participants) {
    return { error: participants.error };
  }

  const firstMonth = firstInvoiceMonth(purchaseDate, card.closingDay);
  const months = generateInstallmentMonths(firstMonth, installmentsCount);
  const values = splitValue(totalCents, installmentsCount);

  await db.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        cardId,
        description,
        category,
        totalCents,
        purchaseDate,
        installmentsCount,
        ownerUserId: user.userId,
      },
    });

    await tx.purchaseInstallment.createMany({
      data: months.map((month, i) => ({
        purchaseId: purchase.id,
        installmentNumber: i + 1,
        referenceYear: month.year,
        referenceMonth: month.month,
        valueCents: values[i],
      })),
    });

    await tx.purchaseParticipant.createMany({
      data: participants.participantUserIds.map((userId) => ({
        purchaseId: purchase.id,
        userId,
      })),
    });

    await tx.user.update({
      where: { id: user.userId },
      data: { lastUsedCardId: cardId },
    });
  });

  revalidatePath("/purchases");
  return {};
}

export type ToggleInstallmentPaidResult = { error?: string };

export async function toggleInstallmentPaid(
  installmentId: string
): Promise<ToggleInstallmentPaidResult> {
  const user = await requireUser();

  const installment = await db.purchaseInstallment.findUnique({
    where: { id: installmentId },
    include: { purchase: { include: { participants: true } } },
  });

  if (!installment) {
    return { error: "Parcela não encontrada." };
  }

  const visible = installment.purchase.participants.some(
    (p) => p.userId === user.userId
  );

  if (!visible) {
    return { error: "Parcela não encontrada." };
  }

  const nextPaid = !installment.paid;

  await db.purchaseInstallment.update({
    where: { id: installmentId },
    data: { paid: nextPaid, paidAt: nextPaid ? new Date() : null },
  });

  revalidatePath(`/purchases/${installment.purchaseId}`);
  return {};
}

export type UpdatePurchaseResult = { error?: string };

// Editar cartao/descricao/participantes e sempre permitido, mesmo com
// parcela paga (AC 9 da Story 1.14, agora estendida a "participantes" no
// lugar de "compartilhamento" - Req-11 da divisao entre N participantes).
// So valor, numero de parcelas e data da compra disparam regeneracao das
// installments - e so sao aceitos se nenhuma installment ja estiver paga,
// senao a acao e bloqueada (AC 10 - ver Dev Notes: reconciliar parcelas
// pagas com uma regeneracao seria ambiguo).
export async function updatePurchase(
  purchaseId: string,
  input: UpdatePurchaseInput
): Promise<UpdatePurchaseResult> {
  const user = await requireUser();

  const purchase = await db.purchase.findUnique({
    where: { id: purchaseId },
    include: { installments: true, participants: true },
  });

  if (!purchase) {
    return { error: "Compra não encontrada." };
  }

  const visible = purchase.participants.some((p) => p.userId === user.userId);
  if (!visible) {
    return { error: "Compra não encontrada." };
  }

  const parsed = updatePurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const {
    cardId,
    description,
    totalCents,
    purchaseDate,
    installmentsCount,
    additionalParticipantUserIds,
    category,
  } = parsed.data;

  const [card, categoryRecord] = await Promise.all([
    db.card.findUnique({ where: { id: cardId } }),
    db.category.findUnique({ where: { id: category } }),
  ]);
  if (!card || card.ownerUserId !== user.userId) {
    return { error: "Cartão inválido." };
  }
  if (!categoryRecord) {
    return { error: "Categoria inválida." };
  }

  const participants = await resolveParticipantUserIds(
    user.userId,
    additionalParticipantUserIds
  );
  if ("error" in participants) {
    return { error: participants.error };
  }

  const needsRegeneration =
    totalCents !== purchase.totalCents ||
    installmentsCount !== purchase.installmentsCount ||
    purchaseDate.getTime() !== purchase.purchaseDate.getTime();

  const hasPaidInstallment = purchase.installments.some((i) => i.paid);

  if (needsRegeneration && hasPaidInstallment) {
    return {
      error:
        "Não é possível alterar valor, parcelas ou data com parcelas já pagas. Exclua e recrie a compra.",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        cardId,
        description,
        category,
        totalCents,
        purchaseDate,
        installmentsCount,
        ownerUserId: user.userId,
      },
    });

    await tx.purchaseParticipant.deleteMany({ where: { purchaseId } });
    await tx.purchaseParticipant.createMany({
      data: participants.participantUserIds.map((userId) => ({
        purchaseId,
        userId,
      })),
    });

    if (needsRegeneration) {
      await tx.purchaseInstallment.deleteMany({ where: { purchaseId } });

      const firstMonth = firstInvoiceMonth(purchaseDate, card.closingDay);
      const months = generateInstallmentMonths(firstMonth, installmentsCount);
      const values = splitValue(totalCents, installmentsCount);

      await tx.purchaseInstallment.createMany({
        data: months.map((month, i) => ({
          purchaseId,
          installmentNumber: i + 1,
          referenceYear: month.year,
          referenceMonth: month.month,
          valueCents: values[i],
        })),
      });
    }
  });

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseId}`);
  return {};
}

export type DeletePurchaseResult = { error?: string };

export async function deletePurchase(
  purchaseId: string
): Promise<DeletePurchaseResult> {
  const user = await requireUser();

  const purchase = await db.purchase.findUnique({
    where: { id: purchaseId },
    include: { participants: true },
  });

  if (!purchase) {
    return { error: "Compra não encontrada." };
  }

  const visible = purchase.participants.some((p) => p.userId === user.userId);

  if (!visible) {
    return { error: "Compra não encontrada." };
  }

  await db.purchase.update({
    where: { id: purchaseId },
    data: { isActive: false },
  });

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseId}`);
  return {};
}
