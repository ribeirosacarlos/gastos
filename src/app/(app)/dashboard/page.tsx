import { requireUser } from "@/lib/auth";
import { centsToDisplay } from "@/lib/money";
import { ensureRollingInstallments } from "@/lib/actions/fixed-expense-actions";
import {
  getCardLimits,
  getMonthlyTimeline,
  getCombinedBRLTotal,
} from "@/lib/actions/dashboard-actions";
import { UserBadge } from "@/components/user-badge";
import { LimitProgressBar } from "@/components/limit-progress-bar";
import { MonthTimelineChart, type MonthBarData } from "@/components/month-timeline-chart";

export default async function DashboardPage() {
  const user = await requireUser();

  await ensureRollingInstallments();

  const [cardLimits, timeline] = await Promise.all([
    getCardLimits(),
    getMonthlyTimeline(),
  ]);

  const monthBars: MonthBarData[] = await Promise.all(
    timeline.map(async (m) => {
      const [purchasesBRL, fixedBRL] = await Promise.all([
        getCombinedBRLTotal(m.breakdown.purchases),
        getCombinedBRLTotal(m.breakdown.fixedExpenses),
      ]);
      return {
        year: m.year,
        month: m.month,
        purchasesBRLCents: purchasesBRL.totalBRLCents,
        fixedBRLCents: fixedBRL.totalBRLCents,
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
