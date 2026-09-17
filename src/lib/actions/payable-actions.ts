"use server";

import { getCombinedBRLTotal } from "@/lib/actions/dashboard-actions";
import { requireUser } from "@/lib/auth";
import {
  dueInvoiceMonth,
  generateInstallmentMonths,
  getDueUrgency,
  invoiceDueDate,
  type DueUrgency,
  type YearMonth,
} from "@/lib/dates";
import { db } from "@/lib/db";
import { splitPurchaseShare } from "@/lib/money";

const PAYABLES_TIMELINE_MONTHS = 6;
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

// --- Resumo enxuto pro Dashboard (fatura corrente de cada cartao de
// terceiro em que participo) -------------------------------------------

interface PayableCardDue {
  cardId: string;
  currency: string;
  ownerUserId: string;
  ownerName: string;
  dueDateISO: string;
  totalCents: number;
  unpaidCents: number;
}

// Espelha getCardLimits() (dashboard-actions.ts), mas para cartoes de OUTRAS
// pessoas onde o usuario atual e participante - usa a mesma fatura "devida
// agora" (dueInvoiceMonth via closingDay), so que somando a MINHA parte
// (splitPurchaseShare) em vez do valor bruto da parcela.
async function getPayableCardsDue(): Promise<PayableCardDue[]> {
  const user = await requireUser();
  const now = new Date();

  const cards = await db.card.findMany({
    where: {
      isActive: true,
      ownerUserId: { not: user.userId },
      purchases: {
        some: { isActive: true, participants: { some: { userId: user.userId } } },
      },
    },
    include: {
      owner: { select: { id: true, name: true } },
      purchases: {
        where: { isActive: true, participants: { some: { userId: user.userId } } },
        include: {
          installments: true,
          participants: { select: { userId: true } },
        },
      },
    },
  });

  return cards
    .map((card) => {
      const dueMonth = dueInvoiceMonth(now, card.closingDay);
      const dueDate = invoiceDueDate(dueMonth.year, dueMonth.month, card.dueDay);

      let totalCents = 0;
      let unpaidCents = 0;

      for (const purchase of card.purchases) {
        const orderedParticipantIds = [
          purchase.ownerUserId,
          ...purchase.participants
            .map((p) => p.userId)
            .filter((id) => id !== purchase.ownerUserId),
        ];

        for (const installment of purchase.installments) {
          if (
            installment.referenceYear !== dueMonth.year ||
            installment.referenceMonth !== dueMonth.month
          ) {
            continue;
          }

          const share =
            splitPurchaseShare(
              installment.valueCents,
              orderedParticipantIds,
              purchase.chargedUserId
            )[user.userId] ?? 0;
          if (share <= 0) continue;

          totalCents += share;
          if (!installment.paid) unpaidCents += share;
        }
      }

      return {
        cardId: card.id,
        currency: card.currency,
        ownerUserId: card.ownerUserId,
        ownerName: card.owner.name,
        dueDateISO: dueDate.toISOString(),
        totalCents,
        unpaidCents,
      };
    })
    .filter((card) => card.totalCents > 0);
}

export interface PayablePersonDueSummary {
  ownerUserId: string;
  ownerName: string;
  // Vencimento mais proximo entre os cartoes dessa pessoa ("primeiro
  // vencimento") - e o que determina o aviso leve/forte exibido.
  dueDateISO: string;
  dueUrgency: DueUrgency;
  totalBRLCents: number;
  ignoredCurrencies: string[];
}

// Total por PESSOA (nao por cartao) do que devo pagar agora - soma a fatura
// devida de todos os cartoes de terceiro dela em que participo, convertida
// pra BRL (pode ter cartoes em moedas diferentes), usando a data do
// vencimento mais proximo entre eles pro aviso de urgencia.
export async function getPayablePeopleDueSummary(): Promise<PayablePersonDueSummary[]> {
  const now = new Date();
  const cards = await getPayableCardsDue();

  const order: string[] = [];
  const names = new Map<string, string>();
  const earliestDueDate = new Map<string, string>();
  const totalsByCurrency = new Map<string, Record<string, number>>();

  for (const card of cards) {
    if (!names.has(card.ownerUserId)) {
      order.push(card.ownerUserId);
      names.set(card.ownerUserId, card.ownerName);
    }

    const currentEarliest = earliestDueDate.get(card.ownerUserId);
    if (!currentEarliest || card.dueDateISO < currentEarliest) {
      earliestDueDate.set(card.ownerUserId, card.dueDateISO);
    }

    const currencyMap = totalsByCurrency.get(card.ownerUserId) ?? {};
    addTo(currencyMap, card.currency, card.unpaidCents);
    totalsByCurrency.set(card.ownerUserId, currencyMap);
  }

  const results = await Promise.all(
    order.map(async (ownerUserId) => {
      const combined = await getCombinedBRLTotal(totalsByCurrency.get(ownerUserId) ?? {});
      const dueDateISO = earliestDueDate.get(ownerUserId)!;

      return {
        ownerUserId,
        ownerName: names.get(ownerUserId)!,
        dueDateISO,
        dueUrgency: getDueUrgency(new Date(dueDateISO), now),
        totalBRLCents: combined.totalBRLCents,
        ignoredCurrencies: combined.ignoredCurrencies,
      };
    })
  );

  return results
    .filter((person) => person.totalBRLCents > 0)
    .sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO));
}

// --- Timeline completa pra tela "A pagar" -------------------------------

export interface PayableLine {
  purchaseId: string;
  installmentId: string;
  description: string;
  purchaseDateISO: string;
  cardId: string;
  cardName: string;
  cardColor: string;
  currency: string;
  ownerUserId: string;
  ownerName: string;
  amountCents: number;
  splitLabel: "Dividida" | "100%";
  referenceYear: number;
  referenceMonth: number;
  installmentNumber: number;
  dueDateISO: string;
  dueUrgency: DueUrgency;
}

export interface PayableCardGroup {
  cardId: string;
  cardName: string;
  cardColor: string;
  currency: string;
  ownerUserId: string;
  ownerName: string;
  dueDay: number;
  lines: PayableLine[];
  totalsByCurrency: Record<string, number>;
  totalBRLCents: number;
  nextInvoice: {
    year: number;
    month: number;
    dueDateISO: string;
    dueUrgency: DueUrgency;
    amountCents: number;
  } | null;
}

export interface PayablePersonSummary {
  userId: string;
  name: string;
  color: string;
  cards: PayableCardGroup[];
  lines: PayableLine[];
  totalsByCurrency: Record<string, number>;
  totalBRLCents: number;
  ignoredCurrencies: string[];
}

export interface PayableMonthTotal {
  year: number;
  month: number;
  totalsByCurrency: Record<string, number>;
  byPerson: Record<string, Record<string, number>>;
  totalBRLCents: number;
}

export interface PayablesTimelineSummary {
  months: PayableMonthTotal[];
  people: PayablePersonSummary[];
  cards: PayableCardGroup[];
  lines: PayableLine[];
  totalsByCurrency: Record<string, number>;
  totalBRLCents: number;
  ignoredCurrencies: string[];
}

export interface PayablesTimelineFilter {
  category?: string;
}

export async function getPayablesTimelineSummary(
  monthsAhead: number = PAYABLES_TIMELINE_MONTHS,
  filter?: PayablesTimelineFilter
): Promise<PayablesTimelineSummary> {
  const user = await requireUser();
  const now = new Date();
  const months = generateInstallmentMonths(currentYearMonth(), monthsAhead);
  const monthFilter = months.map((month) => ({
    referenceYear: month.year,
    referenceMonth: month.month,
  }));

  const installments = await db.purchaseInstallment.findMany({
    where: {
      OR: monthFilter,
      purchase: {
        ownerUserId: { not: user.userId },
        isActive: true,
        participants: { some: { userId: user.userId } },
        ...(filter?.category ? { category: filter.category } : {}),
      },
    },
    include: {
      purchase: {
        include: {
          card: { select: { id: true, name: true, color: true, currency: true, dueDay: true } },
          owner: { select: { id: true, name: true } },
          participants: { select: { userId: true } },
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
  const lines: PayableLine[] = [];
  const totalsByCurrency: Record<string, number> = {};
  const monthMap = new Map<string, PayableMonthTotal>(
    months.map((month) => [
      `${month.year}-${month.month}`,
      { year: month.year, month: month.month, totalsByCurrency: {}, byPerson: {}, totalBRLCents: 0 },
    ])
  );

  for (const installment of installments) {
    const purchase = installment.purchase;
    const orderedParticipantIds = [
      purchase.ownerUserId,
      ...purchase.participants
        .map((p) => p.userId)
        .filter((id) => id !== purchase.ownerUserId),
    ];
    const shares = splitPurchaseShare(
      installment.valueCents,
      orderedParticipantIds,
      purchase.chargedUserId
    );
    const amountCents = shares[user.userId] ?? 0;
    if (amountCents <= 0) continue;

    const monthKey = `${installment.referenceYear}-${installment.referenceMonth}`;
    const month = monthMap.get(monthKey);
    if (!month) continue;

    if (!personMeta.has(purchase.ownerUserId)) {
      peopleOrder.push(purchase.ownerUserId);
      personMeta.set(purchase.ownerUserId, {
        name: purchase.owner.name,
        color: getPersonColor(peopleOrder.length - 1),
      });
    }

    const dueDate = invoiceDueDate(
      installment.referenceYear,
      installment.referenceMonth,
      purchase.card.dueDay
    );

    lines.push({
      purchaseId: installment.purchaseId,
      installmentId: installment.id,
      description: purchase.description,
      purchaseDateISO: purchase.purchaseDate.toISOString(),
      cardId: purchase.card.id,
      cardName: purchase.card.name,
      cardColor: purchase.card.color,
      currency: purchase.card.currency,
      ownerUserId: purchase.ownerUserId,
      ownerName: purchase.owner.name,
      amountCents,
      splitLabel: purchase.chargedUserId ? "100%" : "Dividida",
      referenceYear: installment.referenceYear,
      referenceMonth: installment.referenceMonth,
      installmentNumber: installment.installmentNumber,
      dueDateISO: dueDate.toISOString(),
      dueUrgency: getDueUrgency(dueDate, now),
    });

    addTo(totalsByCurrency, purchase.card.currency, amountCents);
    addTo(month.totalsByCurrency, purchase.card.currency, amountCents);
    const byPersonCurrency = month.byPerson[purchase.ownerUserId] ?? {};
    addTo(byPersonCurrency, purchase.card.currency, amountCents);
    month.byPerson[purchase.ownerUserId] = byPersonCurrency;
  }

  // Agrupa por cartao (dentro de cada dono) - um dono pode ter mais de um
  // cartao compartilhado comigo.
  const cardMeta = new Map<
    string,
    { cardName: string; cardColor: string; currency: string; ownerUserId: string; dueDay: number }
  >();
  const cardOrder: string[] = [];
  for (const installment of installments) {
    const purchase = installment.purchase;
    if (!cardMeta.has(purchase.card.id)) {
      cardOrder.push(purchase.card.id);
      cardMeta.set(purchase.card.id, {
        cardName: purchase.card.name,
        cardColor: purchase.card.color,
        currency: purchase.card.currency,
        ownerUserId: purchase.ownerUserId,
        dueDay: purchase.card.dueDay,
      });
    }
  }

  const cardsBase = cardOrder.map((cardId) => {
    const meta = cardMeta.get(cardId)!;
    const cardLines = lines.filter((line) => line.cardId === cardId);
    const totals = cardLines.reduce<Record<string, number>>((acc, line) => {
      addTo(acc, line.currency, line.amountCents);
      return acc;
    }, {});

    // Proxima fatura em aberto pra esse cartao = menor (referenceYear,
    // referenceMonth) presente na janela consultada (que ja comeca no mes
    // atual - ver generateInstallmentMonths acima).
    const nextMonthKey = cardLines.reduce<{ year: number; month: number } | null>(
      (min, line) => {
        if (!min) return { year: line.referenceYear, month: line.referenceMonth };
        return line.referenceYear < min.year ||
          (line.referenceYear === min.year && line.referenceMonth < min.month)
          ? { year: line.referenceYear, month: line.referenceMonth }
          : min;
      },
      null
    );
    const nextLines = nextMonthKey
      ? cardLines.filter(
          (line) =>
            line.referenceYear === nextMonthKey.year && line.referenceMonth === nextMonthKey.month
        )
      : [];
    const nextAmountCents = nextLines.reduce((sum, line) => sum + line.amountCents, 0);

    return {
      cardId,
      cardName: meta.cardName,
      cardColor: meta.cardColor,
      currency: meta.currency,
      ownerUserId: meta.ownerUserId,
      ownerName: personMeta.get(meta.ownerUserId)?.name ?? meta.ownerUserId,
      dueDay: meta.dueDay,
      lines: cardLines,
      totalsByCurrency: totals,
      nextInvoice:
        nextMonthKey && nextLines.length > 0
          ? {
              year: nextMonthKey.year,
              month: nextMonthKey.month,
              dueDateISO: nextLines[0].dueDateISO,
              dueUrgency: nextLines[0].dueUrgency,
              amountCents: nextAmountCents,
            }
          : null,
    };
  });

  const peopleBase = peopleOrder.map((userId) => ({
    userId,
    name: personMeta.get(userId)?.name ?? userId,
    color: personMeta.get(userId)?.color ?? getPersonColor(0),
    lines: lines.filter((line) => line.ownerUserId === userId),
    cards: cardsBase.filter((card) => card.ownerUserId === userId),
    totalsByCurrency: lines
      .filter((line) => line.ownerUserId === userId)
      .reduce<Record<string, number>>((acc, line) => {
        addTo(acc, line.currency, line.amountCents);
        return acc;
      }, {}),
  }));

  const [overall, ...computedTotals] = await Promise.all([
    getCombinedBRLTotal(totalsByCurrency),
    ...peopleBase.map((person) => getCombinedBRLTotal(person.totalsByCurrency)),
    ...cardsBase.map((card) => getCombinedBRLTotal(card.totalsByCurrency)),
    ...months.map((month) =>
      getCombinedBRLTotal(monthMap.get(`${month.year}-${month.month}`)?.totalsByCurrency ?? {})
    ),
  ]);

  const peopleTotals = computedTotals.slice(0, peopleBase.length);
  const cardTotals = computedTotals.slice(peopleBase.length, peopleBase.length + cardsBase.length);
  const monthTotals = computedTotals.slice(peopleBase.length + cardsBase.length);

  const cards: PayableCardGroup[] = cardsBase.map((card, index) => ({
    ...card,
    totalBRLCents: cardTotals[index]?.totalBRLCents ?? 0,
  }));

  const people: PayablePersonSummary[] = peopleBase
    .map((person, index) => ({
      userId: person.userId,
      name: person.name,
      color: person.color,
      lines: person.lines,
      cards: person.cards.map((card) => cards.find((c) => c.cardId === card.cardId)!),
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
    cards,
    lines,
    totalsByCurrency,
    totalBRLCents: overall.totalBRLCents,
    ignoredCurrencies: overall.ignoredCurrencies,
  };
}
