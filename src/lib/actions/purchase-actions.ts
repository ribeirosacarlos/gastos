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
    isShared,
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
        isShared,
        ownerUserId: isShared ? null : user.userId,
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
    include: { purchase: true },
  });

  if (!installment) {
    return { error: "Parcela não encontrada." };
  }

  const visible =
    installment.purchase.isShared ||
    installment.purchase.ownerUserId === user.userId;

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

// Editar cartao/descricao/compartilhamento e sempre permitido, mesmo com
// parcela paga (AC 9 da Story 1.14). So valor, numero de parcelas e data da
// compra disparam regeneracao das installments - e so sao aceitos se nenhuma
// installment ja estiver paga, senao a acao e bloqueada (AC 10 - ver Dev
// Notes: reconciliar parcelas pagas com uma regeneracao seria ambiguo).
export async function updatePurchase(
  purchaseId: string,
  input: UpdatePurchaseInput
): Promise<UpdatePurchaseResult> {
  const user = await requireUser();

  const purchase = await db.purchase.findUnique({
    where: { id: purchaseId },
    include: { installments: true },
  });

  if (!purchase) {
    return { error: "Compra não encontrada." };
  }

  const visible = purchase.isShared || purchase.ownerUserId === user.userId;
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
    isShared,
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
        isShared,
        ownerUserId: isShared ? null : user.userId,
      },
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

  const purchase = await db.purchase.findUnique({ where: { id: purchaseId } });

  if (!purchase) {
    return { error: "Compra não encontrada." };
  }

  const visible = purchase.isShared || purchase.ownerUserId === user.userId;

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
