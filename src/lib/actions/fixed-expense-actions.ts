"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateInstallmentMonths, type YearMonth } from "@/lib/dates";
import {
  fixedExpenseSchema,
  type FixedExpenseInput,
} from "@/lib/validation/schemas";

// Ver Dev Notes da Story 1.6: numero concreto citado como exemplo no plano
// aprovado ("gera uma janela rolante, ex. 12 meses a frente").
const ROLLING_WINDOW_MONTHS = 12;

function toTotalMonths(ym: YearMonth): number {
  return ym.year * 12 + (ym.month - 1);
}

function maxYearMonth(a: YearMonth, b: YearMonth): YearMonth {
  return toTotalMonths(a) >= toTotalMonths(b) ? a : b;
}

function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// Nunca gera antes do mes inicial do gasto fixo, mesmo que o mes corrente
// ja tenha passado dele - a janela sempre comeca no maior entre os dois.
function rollingWindowMonths(start: YearMonth): YearMonth[] {
  const windowStart = maxYearMonth(start, currentYearMonth());
  return generateInstallmentMonths(windowStart, ROLLING_WINDOW_MONTHS);
}

export type CreateFixedExpenseResult = { error?: string };

export async function createFixedExpense(
  input: FixedExpenseInput
): Promise<CreateFixedExpenseResult> {
  const user = await requireUser();

  const parsed = fixedExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const {
    description,
    valueCents,
    currency,
    startYear,
    startMonth,
    totalInstallments,
    isShared,
  } = parsed.data;

  await db.$transaction(async (tx) => {
    const fixedExpense = await tx.fixedExpense.create({
      data: {
        description,
        valueCents,
        currency,
        startYear,
        startMonth,
        totalInstallments: totalInstallments ?? null,
        isShared,
        ownerUserId: isShared ? null : user.userId,
      },
    });

    const months = totalInstallments
      ? generateInstallmentMonths(
          { year: startYear, month: startMonth },
          totalInstallments
        )
      : rollingWindowMonths({ year: startYear, month: startMonth });

    await tx.fixedExpenseInstallment.createMany({
      data: months.map((month, i) => ({
        fixedExpenseId: fixedExpense.id,
        installmentNumber: i + 1,
        referenceYear: month.year,
        referenceMonth: month.month,
        valueCents,
      })),
    });
  });

  revalidatePath("/fixed-expenses");
  return {};
}

// Idempotente: so cria as linhas que ainda nao existem para
// (fixedExpenseId, referenceYear, referenceMonth). skipDuplicates do Prisma
// nao e suportado no provider SQLite deste projeto (confirmado via teste
// isolado antes de implementar - ver Dev Notes da Story 1.6), entao a
// checagem de duplicidade e feita manualmente buscando os meses existentes
// antes do createMany.
export async function ensureRollingInstallments(): Promise<void> {
  const user = await requireUser();

  const fixedExpenses = await db.fixedExpense.findMany({
    where: {
      isActive: true,
      totalInstallments: null,
      OR: [{ ownerUserId: user.userId }, { isShared: true }],
    },
  });

  for (const fe of fixedExpenses) {
    const months = rollingWindowMonths({
      year: fe.startYear,
      month: fe.startMonth,
    });

    const existing = await db.fixedExpenseInstallment.findMany({
      where: {
        fixedExpenseId: fe.id,
        OR: months.map((m) => ({
          referenceYear: m.year,
          referenceMonth: m.month,
        })),
      },
      select: { referenceYear: true, referenceMonth: true },
    });

    const existingKeys = new Set(
      existing.map((e) => `${e.referenceYear}-${e.referenceMonth}`)
    );
    const missing = months.filter(
      (m) => !existingKeys.has(`${m.year}-${m.month}`)
    );

    if (missing.length === 0) continue;

    const lastInstallment = await db.fixedExpenseInstallment.aggregate({
      where: { fixedExpenseId: fe.id },
      _max: { installmentNumber: true },
    });
    let nextNumber = (lastInstallment._max.installmentNumber ?? 0) + 1;

    await db.fixedExpenseInstallment.createMany({
      data: missing.map((m) => ({
        fixedExpenseId: fe.id,
        installmentNumber: nextNumber++,
        referenceYear: m.year,
        referenceMonth: m.month,
        valueCents: fe.valueCents,
      })),
    });
  }

  revalidatePath("/fixed-expenses");
}

export type ToggleFixedExpenseInstallmentPaidResult = { error?: string };

export async function toggleFixedExpenseInstallmentPaid(
  installmentId: string
): Promise<ToggleFixedExpenseInstallmentPaidResult> {
  const user = await requireUser();

  const installment = await db.fixedExpenseInstallment.findUnique({
    where: { id: installmentId },
    include: { fixedExpense: true },
  });

  if (!installment) {
    return { error: "Parcela não encontrada." };
  }

  const visible =
    installment.fixedExpense.isShared ||
    installment.fixedExpense.ownerUserId === user.userId;

  if (!visible) {
    return { error: "Parcela não encontrada." };
  }

  const nextPaid = !installment.paid;

  await db.fixedExpenseInstallment.update({
    where: { id: installmentId },
    data: { paid: nextPaid, paidAt: nextPaid ? new Date() : null },
  });

  revalidatePath(`/fixed-expenses/${installment.fixedExpenseId}`);
  return {};
}

export type DeactivateFixedExpenseResult = { error?: string };

export async function deactivateFixedExpense(
  fixedExpenseId: string
): Promise<DeactivateFixedExpenseResult> {
  const user = await requireUser();

  const fixedExpense = await db.fixedExpense.findUnique({
    where: { id: fixedExpenseId },
  });

  if (!fixedExpense) {
    return { error: "Gasto fixo não encontrado." };
  }

  const visible =
    fixedExpense.isShared || fixedExpense.ownerUserId === user.userId;

  if (!visible) {
    return { error: "Gasto fixo não encontrado." };
  }

  await db.fixedExpense.update({
    where: { id: fixedExpenseId },
    data: { isActive: false },
  });

  revalidatePath("/fixed-expenses");
  revalidatePath(`/fixed-expenses/${fixedExpenseId}`);
  return {};
}
