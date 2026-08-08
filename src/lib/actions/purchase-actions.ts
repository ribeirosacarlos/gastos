"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { firstInvoiceMonth, generateInstallmentMonths } from "@/lib/dates";
import { splitValue } from "@/lib/money";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/schemas";

export type CreatePurchaseResult = { error?: string };

export async function createPurchase(
  input: PurchaseInput
): Promise<CreatePurchaseResult> {
  const user = await requireUser();

  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { cardId, description, totalCents, purchaseDate, installmentsCount, isShared } =
    parsed.data;

  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card || card.ownerUserId !== user.userId) {
    return { error: "Cartão inválido." };
  }

  const firstMonth = firstInvoiceMonth(purchaseDate, card.closingDay);
  const months = generateInstallmentMonths(firstMonth, installmentsCount);
  const values = splitValue(totalCents, installmentsCount);

  await db.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        cardId,
        description,
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
