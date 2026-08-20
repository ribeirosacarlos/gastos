"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateInstallmentMonths, type YearMonth } from "@/lib/dates";
import { convertToBRL, splitAmongParticipants, userShareCents } from "@/lib/money";

// Ver Dev Notes da Story 1.8: numero de meses da timeline nao vem do plano
// (que so diz "proximos N meses") - escolha de implementacao razoavel.
const DASHBOARD_TIMELINE_MONTHS = 6;

function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export interface CardLimit {
  cardId: string;
  name: string;
  color: string;
  currency: string;
  limitCents: number;
  usedCents: number;
  availableCents: number;
}

// usedCents e a soma bruta das parcelas nao pagas no cartao - o limite e
// consumido pelo valor cheio da compra, nao pela metade virtual de quem vai
// "pagar" depois (isShared nao entra aqui, ver AC 2 da Story 1.8).
export async function getCardLimits(): Promise<CardLimit[]> {
  const user = await requireUser();

  const cards = await db.card.findMany({
    where: { ownerUserId: user.userId, isActive: true },
    include: {
      purchases: {
        include: {
          installments: { where: { paid: false } },
        },
      },
    },
  });

  return cards.map((card) => {
    const usedCents = card.purchases.reduce(
      (sum, p) =>
        sum + p.installments.reduce((s, i) => s + i.valueCents, 0),
      0
    );

    return {
      cardId: card.id,
      name: card.name,
      color: card.color,
      currency: card.currency,
      limitCents: card.limitCents,
      usedCents,
      availableCents: card.limitCents - usedCents,
    };
  });
}

export interface MonthlyTotal {
  year: number;
  month: number;
  myTotals: Record<string, number>;
  coupleTotals: Record<string, number>;
  breakdown: {
    purchases: Record<string, number>;
    fixedExpenses: Record<string, number>;
  };
  // Minha parte (userShareCents) do gasto em compras naquele mes, por
  // cartao - na moeda do proprio cartao (cada cartao tem uma unica moeda,
  // sem ambiguidade). Gastos fixos nao entram aqui (nao tem cartao).
  byCard: Record<string, number>;
  // categoria -> moeda -> centavos (minha parte), combinando compras E
  // gastos fixos daquele mes. Fica por moeda (nao um numero direto) porque
  // uma mesma categoria pode ter gastos em moedas diferentes - o chamador
  // converte pra BRL com getCombinedBRLTotal(byCategory[categoria]), mesmo
  // padrao ja usado pra byCard. Desvio deliberado do tipo `Record<string,
  // number>` original da Story 1.13 - somar centavos de moedas diferentes
  // sem converter primeiro estaria errado.
  byCategory: Record<string, Record<string, number>>;
}

function addTo(record: Record<string, number>, currency: string, amount: number) {
  record[currency] = (record[currency] ?? 0) + amount;
}

function addToCategory(
  byCategory: Record<string, Record<string, number>>,
  category: string,
  currency: string,
  amount: number
) {
  const currencyMap = byCategory[category] ?? {};
  currencyMap[currency] = (currencyMap[currency] ?? 0) + amount;
  byCategory[category] = currencyMap;
}

export async function getMonthlyTimeline(
  monthsAhead: number = DASHBOARD_TIMELINE_MONTHS
): Promise<MonthlyTotal[]> {
  const user = await requireUser();

  const months = generateInstallmentMonths(currentYearMonth(), monthsAhead);
  const monthFilter = months.map((m) => ({
    referenceYear: m.year,
    referenceMonth: m.month,
  }));

  const [purchaseInstallments, fixedExpenseInstallments] = await Promise.all([
    db.purchaseInstallment.findMany({
      where: {
        OR: monthFilter,
        purchase: {
          participants: { some: { userId: user.userId } },
          isActive: true,
        },
      },
      include: { purchase: { include: { card: true, participants: true } } },
    }),
    db.fixedExpenseInstallment.findMany({
      where: {
        OR: monthFilter,
        fixedExpense: {
          OR: [{ ownerUserId: user.userId }, { isShared: true }],
          isActive: true,
        },
      },
      include: { fixedExpense: true },
    }),
  ]);

  return months.map((m) => {
    const myTotals: Record<string, number> = {};
    const coupleTotals: Record<string, number> = {};
    const breakdownPurchases: Record<string, number> = {};
    const breakdownFixedExpenses: Record<string, number> = {};
    const byCard: Record<string, number> = {};
    const byCategory: Record<string, Record<string, number>> = {};

    for (const pi of purchaseInstallments) {
      if (pi.referenceYear !== m.year || pi.referenceMonth !== m.month) continue;
      const currency = pi.purchase.card.currency;
      // Dono sempre primeiro na ordem - absorve o(s) centavo(s) de resto
      // deterministicamente (ver splitAmongParticipants em money.ts).
      const orderedParticipantIds = [
        pi.purchase.ownerUserId,
        ...pi.purchase.participants
          .map((p) => p.userId)
          .filter((userId) => userId !== pi.purchase.ownerUserId),
      ];
      const share =
        splitAmongParticipants(pi.valueCents, orderedParticipantIds)[
          user.userId
        ] ?? 0;
      addTo(myTotals, currency, share);
      addTo(coupleTotals, currency, pi.valueCents);
      addTo(breakdownPurchases, currency, share);
      addTo(byCard, pi.purchase.cardId, share);
      addToCategory(byCategory, pi.purchase.category, currency, share);
    }

    for (const fi of fixedExpenseInstallments) {
      if (fi.referenceYear !== m.year || fi.referenceMonth !== m.month) continue;
      const currency = fi.fixedExpense.currency;
      const share = userShareCents(fi.valueCents, fi.fixedExpense.isShared);
      addTo(myTotals, currency, share);
      addTo(coupleTotals, currency, fi.valueCents);
      addTo(breakdownFixedExpenses, currency, share);
      addToCategory(byCategory, fi.fixedExpense.category, currency, share);
    }

    return {
      year: m.year,
      month: m.month,
      myTotals,
      coupleTotals,
      breakdown: {
        purchases: breakdownPurchases,
        fixedExpenses: breakdownFixedExpenses,
      },
      byCard,
      byCategory,
    };
  });
}

export interface CardColor {
  id: string;
  name: string;
  currency: string;
  color: string;
}

export async function getActiveCardColors(): Promise<CardColor[]> {
  const user = await requireUser();

  return db.card.findMany({
    where: { ownerUserId: user.userId, isActive: true },
    select: { id: true, name: true, currency: true, color: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface CombinedBRLResult {
  totalBRLCents: number;
  ignoredCurrencies: string[];
}

// Nao chama requireUser(): taxas de cambio sao globais (nao por usuario) e a
// funcao so agrega totais ja calculados pelo chamador - quem acessa o
// dashboard ja passou por requireUser() na propria pagina.
export async function getCombinedBRLTotal(
  totalsByCurrency: Record<string, number>
): Promise<CombinedBRLResult> {
  const rates = await db.exchangeRate.findMany();
  const rateMap = new Map(rates.map((r) => [r.currency, r.rateToBRL]));

  let totalBRLCents = 0;
  const ignoredCurrencies: string[] = [];

  for (const [currency, cents] of Object.entries(totalsByCurrency)) {
    if (currency === "BRL") {
      totalBRLCents += cents;
      continue;
    }

    const rate = rateMap.get(currency);
    if (rate === undefined) {
      ignoredCurrencies.push(currency);
      continue;
    }

    totalBRLCents += convertToBRL(cents, rate);
  }

  return { totalBRLCents, ignoredCurrencies };
}
