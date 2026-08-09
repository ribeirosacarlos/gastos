import { requireUser } from "@/lib/auth";
import { centsToDisplay } from "@/lib/money";
import { ensureRollingInstallments } from "@/lib/actions/fixed-expense-actions";
import {
  getCardLimits,
  getMonthlyTimeline,
  getCombinedBRLTotal,
  getActiveCardColors,
} from "@/lib/actions/dashboard-actions";
import { UserBadge } from "@/components/user-badge";
import { LimitProgressBar } from "@/components/limit-progress-bar";
import {
  MonthTimelineChart,
  FIXED_EXPENSES_COLOR,
  FIXED_EXPENSES_KEY,
  type MonthBarData,
} from "@/components/month-timeline-chart";
import { categoryLabel } from "@/lib/categories";

export default async function DashboardPage() {
  const user = await requireUser();

  await ensureRollingInstallments();

  const [cardLimits, timeline, cardColors] = await Promise.all([
    getCardLimits(),
    getMonthlyTimeline(),
    getActiveCardColors(),
  ]);

  const monthBars: MonthBarData[] = await Promise.all(
    timeline.map(async (m) => {
      const [cardSegments, fixedBRL] = await Promise.all([
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
        getCombinedBRLTotal(m.breakdown.fixedExpenses),
      ]);

      return {
        year: m.year,
        month: m.month,
        segments: [
          ...cardSegments,
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

  // Total combinado do periodo inteiro (soma dos meses da timeline) - "meu"
  // (com split aplicado) e "do casal" (bruto), conforme AC 3/4 da Story 1.8.
  const myPeriodTotals: Record<string, number> = {};
  const couplePeriodTotals: Record<string, number> = {};
  for (const m of timeline) {
    for (const [currency, cents] of Object.entries(m.myTotals)) {
      myPeriodTotals[currency] = (myPeriodTotals[currency] ?? 0) + cents;
    }
    for (const [currency, cents] of Object.entries(m.coupleTotals)) {
      couplePeriodTotals[currency] = (couplePeriodTotals[currency] ?? 0) + cents;
    }
  }

  const [myCombined, coupleCombined] = await Promise.all([
    getCombinedBRLTotal(myPeriodTotals),
    getCombinedBRLTotal(couplePeriodTotals),
  ]);

  const ignoredCurrencies = Array.from(
    new Set([...myCombined.ignoredCurrencies, ...coupleCombined.ignoredCurrencies])
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Meu total (≈ BRL)</p>
          <p className="text-lg font-semibold">
            {centsToDisplay(myCombined.totalBRLCents, "BRL")}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total do casal (≈ BRL)</p>
          <p className="text-lg font-semibold">
            {centsToDisplay(coupleCombined.totalBRLCents, "BRL")}
          </p>
        </div>
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
                <span>{categoryLabel(c.category)}</span>
                <span className="text-muted-foreground">
                  {centsToDisplay(c.totalBRLCents, "BRL")} ({c.percent.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
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
          <div className="space-y-2">
            {cardLimits.map((card) => (
              <LimitProgressBar key={card.cardId} card={card} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
