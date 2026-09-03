"use server";

import { getCombinedBRLTotal } from "@/lib/actions/dashboard-actions";
import { requireUser } from "@/lib/auth";
import { generateInstallmentMonths, type YearMonth } from "@/lib/dates";
import { db } from "@/lib/db";
import { splitPurchaseShare } from "@/lib/money";

const RECEIVABLES_TIMELINE_MONTHS = 6;
const PERSON_COLORS = [
  "#0f766e",
  "#0369a1",
  "#b45309",
  "#be123c",
  "#4f46e5",
  "#166534",
  "#7c2d12",
  "#1d4ed8",
];

export interface ReceivableLine {
  purchaseId: string;
  installmentId: string;
  description: string;
  purchaseDateISO: string;
  cardName: string;
  cardColor: string;
  currency: string;
  debtorUserId: string;
  debtorName: string;
  amountCents: number;
  splitLabel: "Dividida" | "100% terceiro";
  referenceYear: number;
  referenceMonth: number;
  installmentNumber: number;
}

export interface ReceivablePersonSummary {
  userId: string;
  name: string;
  color: string;
  lines: ReceivableLine[];
  totalsByCurrency: Record<string, number>;
  totalBRLCents: number;
  ignoredCurrencies: string[];
}

export interface ReceivableMonthTotal {
  year: number;
  month: number;
  totalsByCurrency: Record<string, number>;
  byPerson: Record<string, Record<string, number>>;
  totalBRLCents: number;
}

export interface ReceivablesTimelineSummary {
  months: ReceivableMonthTotal[];
  people: ReceivablePersonSummary[];
  lines: ReceivableLine[];
  totalsByCurrency: Record<string, number>;
  totalBRLCents: number;
  ignoredCurrencies: string[];
}

export interface ReceivablesTimelineFilter {
  category?: string;
}

function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function addTo(record: Record<string, number>, currency: string, amount: number) {
  record[currency] = (record[currency] ?? 0) + amount;
}

function getPersonColor(index: number): string {
  return PERSON_COLORS[index % PERSON_COLORS.length];
}

export async function getReceivablesTimelineSummary(
  monthsAhead: number = RECEIVABLES_TIMELINE_MONTHS,
  filter?: ReceivablesTimelineFilter
): Promise<ReceivablesTimelineSummary> {
  const user = await requireUser();
  const months = generateInstallmentMonths(currentYearMonth(), monthsAhead);
  const monthFilter = months.map((month) => ({
    referenceYear: month.year,
    referenceMonth: month.month,
  }));

  const installments = await db.purchaseInstallment.findMany({
    where: {
      OR: monthFilter,
      purchase: {
        ownerUserId: user.userId,
        isActive: true,
        participants: { some: { userId: { not: user.userId } } },
        ...(filter?.category ? { category: filter.category } : {}),
      },
    },
    include: {
      purchase: {
        include: {
          card: { select: { name: true, color: true, currency: true } },
          participants: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: [
      { referenceYear: "asc" },
      { referenceMonth: "asc" },
      { installmentNumber: "asc" },
    ],
  });

  const personMeta = new Map<string, { name: string; color: string }>();
  const peopleOrder: string[] = [];
  const lines: ReceivableLine[] = [];
  const totalsByCurrency: Record<string, number> = {};
  const monthMap = new Map<string, ReceivableMonthTotal>(
    months.map((month) => [
      `${month.year}-${month.month}`,
      {
        year: month.year,
        month: month.month,
        totalsByCurrency: {},
        byPerson: {},
        totalBRLCents: 0,
      },
    ])
  );

  for (const installment of installments) {
    const orderedParticipantIds = [
      installment.purchase.ownerUserId,
      ...installment.purchase.participants
        .map((participant) => participant.userId)
        .filter((userId) => userId !== installment.purchase.ownerUserId),
    ];
    const shares = splitPurchaseShare(
      installment.valueCents,
      orderedParticipantIds,
      installment.purchase.chargedUserId
    );
    const monthKey = `${installment.referenceYear}-${installment.referenceMonth}`;
    const month = monthMap.get(monthKey);

    if (!month) continue;

    for (const participant of installment.purchase.participants) {
      if (participant.userId === user.userId) continue;

      const amountCents = shares[participant.userId] ?? 0;
      if (amountCents <= 0) continue;

      if (!personMeta.has(participant.userId)) {
        peopleOrder.push(participant.userId);
        personMeta.set(participant.userId, {
          name: participant.user.name,
          color: getPersonColor(peopleOrder.length - 1),
        });
      }

      lines.push({
        purchaseId: installment.purchaseId,
        installmentId: installment.id,
        description: installment.purchase.description,
        purchaseDateISO: installment.purchase.purchaseDate.toISOString(),
        cardName: installment.purchase.card.name,
        cardColor: installment.purchase.card.color,
        currency: installment.purchase.card.currency,
        debtorUserId: participant.user.id,
        debtorName: participant.user.name,
        amountCents,
        splitLabel: installment.purchase.chargedUserId ? "100% terceiro" : "Dividida",
        referenceYear: installment.referenceYear,
        referenceMonth: installment.referenceMonth,
        installmentNumber: installment.installmentNumber,
      });

      addTo(totalsByCurrency, installment.purchase.card.currency, amountCents);
      addTo(month.totalsByCurrency, installment.purchase.card.currency, amountCents);

      const byPersonCurrency = month.byPerson[participant.userId] ?? {};
      addTo(byPersonCurrency, installment.purchase.card.currency, amountCents);
      month.byPerson[participant.userId] = byPersonCurrency;
    }
  }

  const peopleBase = peopleOrder.map((userId) => ({
    userId,
    name: personMeta.get(userId)?.name ?? userId,
    color: personMeta.get(userId)?.color ?? getPersonColor(0),
    lines: lines.filter((line) => line.debtorUserId === userId),
    totalsByCurrency: lines
      .filter((line) => line.debtorUserId === userId)
      .reduce<Record<string, number>>((acc, line) => {
        addTo(acc, line.currency, line.amountCents);
        return acc;
      }, {}),
  }));

  const [overall, ...computedTotals] = await Promise.all([
    getCombinedBRLTotal(totalsByCurrency),
    ...peopleBase.map((person) => getCombinedBRLTotal(person.totalsByCurrency)),
    ...months.map((month) => getCombinedBRLTotal(monthMap.get(`${month.year}-${month.month}`)?.totalsByCurrency ?? {})),
  ]);

  const peopleTotals = computedTotals.slice(0, peopleBase.length);
  const monthTotals = computedTotals.slice(peopleBase.length);

  const people: ReceivablePersonSummary[] = peopleBase
    .map((person, index) => ({
      userId: person.userId,
      name: person.name,
      color: person.color,
      lines: person.lines,
      totalsByCurrency: person.totalsByCurrency,
      totalBRLCents: peopleTotals[index]?.totalBRLCents ?? 0,
      ignoredCurrencies: peopleTotals[index]?.ignoredCurrencies ?? [],
    }))
    .sort((a, b) => b.totalBRLCents - a.totalBRLCents || a.name.localeCompare(b.name, "pt-BR"));

  const monthsWithTotals = months.map((month, index) => ({
    ...(monthMap.get(`${month.year}-${month.month}`) ?? {
      year: month.year,
      month: month.month,
      totalsByCurrency: {},
      byPerson: {},
      totalBRLCents: 0,
    }),
    totalBRLCents: monthTotals[index]?.totalBRLCents ?? 0,
  }));

  return {
    months: monthsWithTotals,
    people,
    lines,
    totalsByCurrency,
    totalBRLCents: overall.totalBRLCents,
    ignoredCurrencies: overall.ignoredCurrencies,
  };
}
