import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { ensureRollingInstallments } from "@/lib/actions/fixed-expense-actions";
import {
  getCardLimits,
  getMonthlyTimeline,
  getCombinedBRLTotal,
  getActiveCardColors,
  payCardInvoice,
} from "@/lib/actions/dashboard-actions";
import { getPayablePeopleDueSummary, getPayablesTimelineSummary } from "@/lib/actions/payable-actions";
import { UserBadge } from "@/components/user-badge";
import { LimitProgressBar } from "@/components/limit-progress-bar";
import { PayableCardSummaryCard } from "@/components/payable-card-summary";
import {
  MonthTimelineChart,
  FIXED_EXPENSES_COLOR,
  FIXED_EXPENSES_KEY,
  type MonthBarData,
} from "@/components/month-timeline-chart";

export default async function DashboardPage() {
  const user = await requireUser();

  await ensureRollingInstallments();

  const [cardLimits, timeline, cardColors, categories, payablePeople, payablesTimeline] =
    await Promise.all([
      getCardLimits(),
      getMonthlyTimeline(),
      getActiveCardColors(),
      db.category.findMany({ select: { id: true, name: true } }),
      getPayablePeopleDueSummary(),
      // Mesma janela de 6 meses de getMonthlyTimeline() (sem filtro de
      // categoria) - so pra extrair a divisao por pessoa (byPerson) de
      // cartao de terceiro, que byCard (abaixo) ja soma no total "Meu
      // total" mas sem virar segmento visivel no grafico.
      getPayablesTimelineSummary(),
    ]);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const monthBars: MonthBarData[] = await Promise.all(
    timeline.map(async (m) => {
      const payableMonth = payablesTimeline.months.find(
        (pm) => pm.year === m.year && pm.month === m.month
      );

      const [cardSegments, payableSegments, fixedBRL] = await Promise.all([
        Promise.all(
          cardColors.map(async (card) => {
            const cents = m.byCard[card.id] ?? 0;
            const result =
              cents > 0
                ? await getCombinedBRLTotal({ [card.currency]: cents })
                : { totalBRLCents: 0 };
            return {
              key: card.id,
              label: card.name,
              color: card.color,
              valueBRLCents: result.totalBRLCents,
            };
          })
        ),
        // Um segmento por PESSOA (nao por cartao) pro que devo em cartao de
        // terceiro nesse mes - ex.: "Carlos" agrupando todos os cartoes dele
        // compartilhados comigo, pra bater com a tela /payable.
        Promise.all(
          payablesTimeline.people.map(async (person) => {
            const currencyMap = payableMonth?.byPerson[person.userId] ?? {};
            const result =
              Object.keys(currencyMap).length > 0
                ? await getCombinedBRLTotal(currencyMap)
                : { totalBRLCents: 0 };
            return {
              key: `payable-${person.userId}`,
              label: person.name,
              color: person.color,
              valueBRLCents: result.totalBRLCents,
            };
          })
        ),
        getCombinedBRLTotal(m.breakdown.fixedExpenses),
      ]);

      return {
        year: m.year,
        month: m.month,
        segments: [
          ...cardSegments,
          ...payableSegments,
          {
            key: FIXED_EXPENSES_KEY,
            label: "Fixos",
            color: FIXED_EXPENSES_COLOR,
            valueBRLCents: fixedBRL.totalBRLCents,
          },
        ],
      };
    })
  );

  // Total combinado do periodo inteiro (soma dos meses da timeline) - minha
  // parte, com split aplicado.
  const myPeriodTotals: Record<string, number> = {};
  for (const m of timeline) {
    for (const [currency, cents] of Object.entries(m.myTotals)) {
      myPeriodTotals[currency] = (myPeriodTotals[currency] ?? 0) + cents;
    }
  }

  const myCombined = await getCombinedBRLTotal(myPeriodTotals);

  const ignoredCurrencies = Array.from(
    new Set([
      ...myCombined.ignoredCurrencies,
      ...payablePeople.flatMap((person) => person.ignoredCurrencies),
    ])
  );

  // Agrega byCategory de todos os meses do periodo (categoria -> moeda ->
  // centavos), depois converte cada categoria pra BRL - mesmo raciocinio da
  // legenda do month-timeline-chart.tsx (Story 1.11), mas por categoria em
  // vez de por cartao, combinando compras e gastos fixos.
  const categoryPeriodTotals: Record<string, Record<string, number>> = {};
  for (const m of timeline) {
    for (const [category, currencyMap] of Object.entries(m.byCategory)) {
      const target = categoryPeriodTotals[category] ?? {};
      for (const [currency, cents] of Object.entries(currencyMap)) {
        target[currency] = (target[currency] ?? 0) + cents;
      }
      categoryPeriodTotals[category] = target;
    }
  }

  const categoryBreakdown = await Promise.all(
    Object.entries(categoryPeriodTotals).map(async ([category, currencyMap]) => {
      const result = await getCombinedBRLTotal(currencyMap);
      return { category, totalBRLCents: result.totalBRLCents };
    })
  );
  const categoryGrandTotal = categoryBreakdown.reduce(
    (sum, c) => sum + c.totalBRLCents,
    0
  );
  const sortedCategoryBreakdown = categoryBreakdown
    .filter((c) => c.totalBRLCents > 0)
    .map((c) => ({
      ...c,
      percent:
        categoryGrandTotal > 0 ? (c.totalBRLCents / categoryGrandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.totalBRLCents - a.totalBRLCents);

  return (
    <main className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <UserBadge name={user.username} />
      </div>

      {ignoredCurrencies.length > 0 && (
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {ignoredCurrencies.join(", ")} não {ignoredCurrencies.length > 1 ? "incluídas" : "incluída"} no
          total combinado — cadastre a taxa em{" "}
          <a href="/settings/currencies" className="underline">
            Configurações
          </a>
          .
        </p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Próximos meses (minha parte)
        </h2>
        <MonthTimelineChart data={monthBars} />
      </section>

      <section className="rounded-lg border p-4">
        <p className="text-xs text-muted-foreground">Meu total (≈ BRL)</p>
        <p className="text-lg font-semibold">
          {centsToDisplay(myCombined.totalBRLCents, "BRL")}
        </p>
      </section>

      {sortedCategoryBreakdown.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Por categoria (≈ BRL, minha parte)
          </h2>
          <ul className="space-y-1">
            {sortedCategoryBreakdown.map((c) => (
              <li
                key={c.category}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{categoryMap.get(c.category) ?? c.category}</span>
                <span className="text-muted-foreground">
                  {centsToDisplay(c.totalBRLCents, "BRL")} ({c.percent.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {payablePeople.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-end">
            <Link href="/payable" className="text-xs underline">
              ver tudo
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {payablePeople.map((person) => (
              <PayableCardSummaryCard key={person.ownerUserId} person={person} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Limite disponível por cartão
        </h2>
        {cardLimits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cartão ativo ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cardLimits.map((card) => (
              <LimitProgressBar
                key={card.cardId}
                card={card}
                onPayInvoice={payCardInvoice}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
