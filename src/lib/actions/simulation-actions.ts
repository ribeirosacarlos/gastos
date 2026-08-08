"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { firstInvoiceMonth, generateInstallmentMonths } from "@/lib/dates";
import { splitValue } from "@/lib/money";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/schemas";

export interface SimulatedInstallment {
  installmentNumber: number;
  referenceYear: number;
  referenceMonth: number;
  valueCents: number;
}

export interface LimitCheck {
  limitCents: number;
  usedCents: number;
  availableBeforeCents: number;
  availableAfterCents: number;
  fits: boolean;
}

export type SimulatePurchaseResult =
  | { error: string }
  | { installments: SimulatedInstallment[]; limitCheck: LimitCheck };

// Nunca escreve no banco - so calcula o preview. A confirmacao real usa
// createPurchase() (Story 1.4) sem nenhuma alteracao, recalculando tudo de
// novo no servidor (ver Story 1.9, AC 5).
export async function simulatePurchase(
  input: PurchaseInput
): Promise<SimulatePurchaseResult> {
  const user = await requireUser();

  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { cardId, totalCents, purchaseDate, installmentsCount } = parsed.data;

  const card = await db.card.findUnique({
    where: { id: cardId },
    include: {
      purchases: {
        include: { installments: { where: { paid: false } } },
      },
    },
  });

  if (!card || card.ownerUserId !== user.userId) {
    return { error: "Cartão inválido." };
  }

  const firstMonth = firstInvoiceMonth(purchaseDate, card.closingDay);
  const months = generateInstallmentMonths(firstMonth, installmentsCount);
  const values = splitValue(totalCents, installmentsCount);

  const installments: SimulatedInstallment[] = months.map((month, i) => ({
    installmentNumber: i + 1,
    referenceYear: month.year,
    referenceMonth: month.month,
    valueCents: values[i],
  }));

  const usedCents = card.purchases.reduce(
    (sum, p) => sum + p.installments.reduce((s, i) => s + i.valueCents, 0),
    0
  );
  const availableBeforeCents = card.limitCents - usedCents;
  const availableAfterCents = availableBeforeCents - totalCents;

  return {
    installments,
    limitCheck: {
      limitCents: card.limitCents,
      usedCents,
      availableBeforeCents,
      availableAfterCents,
      fits: availableAfterCents >= 0,
    },
  };
}
