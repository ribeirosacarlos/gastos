import Link from "next/link";
import { CategoryFilter } from "@/components/category-filter";
import { MonthTimelineChart, type MonthBarData } from "@/components/month-timeline-chart";
import { UserBadge } from "@/components/user-badge";
import { buttonVariants } from "@/components/ui/button";
import { getCombinedBRLTotal } from "@/lib/actions/dashboard-actions";
import { getReceivablesTimelineSummary } from "@/lib/actions/receivable-actions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function currencySummary(totalsByCurrency: Record<string, number>): string[] {
  return Object.entries(totalsByCurrency)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, cents]) => centsToDisplay(cents, currency));
}

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  const { category: rawCategory } = await searchParams;

  const categories = await db.category.findMany({
    select: { id: true, name: true, isActive: true },
  });
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const activeCategories = categories.filter((category) => category.isActive);
  const category = categoryMap.has(rawCategory ?? "") ? rawCategory : undefined;

  const receivables = await getReceivablesTimelineSummary(6, { category });

  const monthBars: MonthBarData[] = await Promise.all(
    receivables.months.map(async (month) => {
      const segments = await Promise.all(
        receivables.people.map(async (person) => {
          const currencyMap = month.byPerson[person.userId] ?? {};
          const result =
            Object.keys(currencyMap).length > 0
              ? await getCombinedBRLTotal(currencyMap)
              : { totalBRLCents: 0 };

          return {
            key: person.userId,
            label: person.name,
            color: person.color,
            valueBRLCents: result.totalBRLCents,
          };
        })
      );

      return {
        year: month.year,
        month: month.month,
        segments,
      };
    })
  );

  return (
    <main className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">A receber</h1>
          <p className="text-sm text-muted-foreground">
            Quanto cada pessoa vai te repassar nas proximas faturas.
          </p>
        </div>
        <UserBadge name={user.username} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryFilter categories={activeCategories} />
      </div>

      {category && (
        <p className="text-sm text-muted-foreground">
          Filtrando por{" "}
          <span className="font-medium text-foreground">
            {categoryMap.get(category) ?? category}
          </span>{" "}
          <Link href="/receivables" className="underline">
            limpar
          </Link>
        </p>
      )}

      {receivables.ignoredCurrencies.length > 0 && (
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {receivables.ignoredCurrencies.join(", ")} nao{" "}
          {receivables.ignoredCurrencies.length > 1 ? "incluidas" : "incluida"} no
          total combinado. Cadastre a taxa em{" "}
          <Link href="/settings/currencies" className="underline">
            Cambio
          </Link>
          .
        </p>
      )}

      {receivables.lines.length === 0 ? (
        <section className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="text-lg font-medium">Nada a receber nas proximas faturas</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {category
              ? "Nenhum valor a receber encontrado nessa categoria no periodo."
              : "Quando voce dividir compras no seu cartao, os valores futuros de cada pessoa aparecem aqui por fatura."}
          </p>
          <div className="mt-4">
            <Link href="/purchases/new" className={buttonVariants()}>
              Nova compra
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Proximas faturas
            </h2>
            <MonthTimelineChart data={monthBars} />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Total a receber (~ BRL)</p>
              <p className="text-lg font-semibold">
                {centsToDisplay(receivables.totalBRLCents, "BRL")}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Pessoas devendo</p>
              <p className="text-lg font-semibold">{receivables.people.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Parcelas a receber</p>
              <p className="text-lg font-semibold">{receivables.lines.length}</p>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Quanto vou receber de cada um
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {receivables.people.map((person) => (
                <article key={person.userId} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: person.color }}
                      />
                      <div>
                        <h3 className="font-medium">{person.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {person.lines.length}{" "}
                          {person.lines.length === 1 ? "parcela no periodo" : "parcelas no periodo"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium">
                      {centsToDisplay(person.totalBRLCents, "BRL")} (~ BRL)
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currencySummary(person.totalsByCurrency).map((value) => (
                      <span
                        key={`${person.userId}-${value}`}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Por fatura e pessoa
            </h2>
            <div className="space-y-3">
              {receivables.months.map((month) => {
                const monthLabel = MONTH_LABEL_FORMATTER.format(
                  new Date(`${month.year}-${String(month.month).padStart(2, "0")}-01T00:00:00.000Z`)
                );
                const monthLines = receivables.lines.filter(
                  (line) =>
                    line.referenceYear === month.year && line.referenceMonth === month.month
                );

                if (monthLines.length === 0) {
                  return null;
                }

                return (
                  <section key={`${month.year}-${month.month}`} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{monthLabel}</h3>
                        <p className="text-sm text-muted-foreground">
                          {monthLines.length}{" "}
                          {monthLines.length === 1 ? "parcela prevista" : "parcelas previstas"}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        {centsToDisplay(month.totalBRLCents, "BRL")} (~ BRL)
                      </p>
                    </div>

                    <ul className="space-y-2">
                      {receivables.people.map((person) => {
                        const personLines = monthLines.filter(
                          (line) => line.debtorUserId === person.userId
                        );
                        if (personLines.length === 0) return null;

                        const personTotals = personLines.reduce<Record<string, number>>(
                          (acc, line) => {
                            acc[line.currency] = (acc[line.currency] ?? 0) + line.amountCents;
                            return acc;
                          },
                          {}
                        );

                        return (
                          <li key={`${month.year}-${month.month}-${person.userId}`} className="rounded-md border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-3 w-3 rounded-sm"
                                  style={{ backgroundColor: person.color }}
                                />
                                <div>
                                  <p className="font-medium">{person.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {currencySummary(personTotals).join(" · ")}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <ul className="mt-3 space-y-2">
                              {personLines.map((line) => (
                                <li
                                  key={line.installmentId}
                                  className="flex items-start justify-between gap-3 text-sm"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span>{line.description}</span>
                                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                                        {line.splitLabel}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1.5">
                                        <span
                                          className="inline-block h-2.5 w-2.5 rounded-full"
                                          style={{ backgroundColor: line.cardColor }}
                                        />
                                        {line.cardName}
                                      </span>{" "}
                                      · compra em {DATE_FORMATTER.format(new Date(line.purchaseDateISO))} · parcela{" "}
                                      {line.installmentNumber}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {centsToDisplay(line.amountCents, line.currency)}
                                    </p>
                                    <Link
                                      href={`/purchases/${line.purchaseId}`}
                                      className="text-xs text-muted-foreground underline"
                                    >
                                      ver compra
                                    </Link>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
