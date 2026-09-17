import Link from "next/link";
import { CategoryFilter } from "@/components/category-filter";
import { MonthTimelineChart, type MonthBarData } from "@/components/month-timeline-chart";
import { UserBadge } from "@/components/user-badge";
import { buttonVariants } from "@/components/ui/button";
import { getCombinedBRLTotal } from "@/lib/actions/dashboard-actions";
import { getPayablesTimelineSummary } from "@/lib/actions/payable-actions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DueUrgency } from "@/lib/dates";

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

const URGENCY_BADGE: Record<DueUrgency, string | null> = {
  ok: null,
  soon: "Vence em breve",
  overdue: "Vencida",
};

const URGENCY_CARD_CLASS: Record<DueUrgency, string> = {
  ok: "",
  soon: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
  overdue: "border-red-500 bg-red-50 dark:bg-red-950/30",
};

const URGENCY_TEXT_CLASS: Record<DueUrgency, string> = {
  ok: "text-muted-foreground",
  soon: "text-amber-600",
  overdue: "text-red-600",
};

function currencySummary(totalsByCurrency: Record<string, number>): string[] {
  return Object.entries(totalsByCurrency)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, cents]) => centsToDisplay(cents, currency));
}

export default async function PayablePage({
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

  const payables = await getPayablesTimelineSummary(6, { category });

  const monthBars: MonthBarData[] = await Promise.all(
    payables.months.map(async (month) => {
      const segments = await Promise.all(
        payables.people.map(async (person) => {
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
          <h1 className="text-xl font-semibold">A pagar</h1>
          <p className="text-sm text-muted-foreground">
            Quanto voce precisa pagar nas proximas faturas de cada cartao e pessoa.
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
          <Link href="/payable" className="underline">
            limpar
          </Link>
        </p>
      )}

      {payables.ignoredCurrencies.length > 0 && (
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {payables.ignoredCurrencies.join(", ")} nao{" "}
          {payables.ignoredCurrencies.length > 1 ? "incluidas" : "incluida"} no
          total combinado. Cadastre a taxa em{" "}
          <Link href="/settings/currencies" className="underline">
            Cambio
          </Link>
          .
        </p>
      )}

      {payables.lines.length === 0 ? (
        <section className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="text-lg font-medium">Nada a pagar nas proximas faturas</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {category
              ? "Nenhum valor a pagar encontrado nessa categoria no periodo."
              : "Quando alguem dividir uma compra no cartao dela com voce, sua parte aparece aqui por fatura."}
          </p>
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Proximas faturas
            </h2>
            <MonthTimelineChart data={monthBars} />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Total a pagar (~ BRL)</p>
              <p className="text-lg font-semibold">
                {centsToDisplay(payables.totalBRLCents, "BRL")}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Pessoas</p>
              <p className="text-lg font-semibold">{payables.people.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Cartoes</p>
              <p className="text-lg font-semibold">{payables.cards.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Parcelas a pagar</p>
              <p className="text-lg font-semibold">{payables.lines.length}</p>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Proxima fatura por cartao
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {payables.cards.map((card) => {
                const urgency = card.nextInvoice?.dueUrgency ?? "ok";
                const badge = URGENCY_BADGE[urgency];

                return (
                  <article
                    key={card.cardId}
                    className={cn("rounded-lg border p-4", URGENCY_CARD_CLASS[urgency])}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: card.cardColor }}
                        />
                        <span className="truncate">{card.cardName}</span>
                      </span>
                      {badge && (
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold",
                            URGENCY_TEXT_CLASS[urgency]
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cartão {card.ownerName} · vence dia {card.dueDay}
                    </p>
                    {card.nextInvoice && (
                      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                        <span className="text-xs text-muted-foreground">
                          vence em{" "}
                          {DATE_FORMATTER.format(new Date(card.nextInvoice.dueDateISO))}
                        </span>
                        <span className="text-sm font-semibold">
                          {centsToDisplay(card.nextInvoice.amountCents, card.currency)}
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Quanto vou pagar pra cada um
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {payables.people.map((person) => (
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
                          {" · "}
                          {person.cards.length}{" "}
                          {person.cards.length === 1 ? "cartao" : "cartoes"}
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
              Por fatura, pessoa e cartao
            </h2>
            <div className="space-y-3">
              {payables.months.map((month) => {
                const monthLabel = MONTH_LABEL_FORMATTER.format(
                  new Date(`${month.year}-${String(month.month).padStart(2, "0")}-01T00:00:00.000Z`)
                );
                const monthLines = payables.lines.filter(
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
                      {payables.people.map((person) => {
                        const personMonthLines = monthLines.filter(
                          (line) => line.ownerUserId === person.userId
                        );
                        if (personMonthLines.length === 0) return null;

                        const personTotals = personMonthLines.reduce<Record<string, number>>(
                          (acc, line) => {
                            acc[line.currency] = (acc[line.currency] ?? 0) + line.amountCents;
                            return acc;
                          },
                          {}
                        );
                        const cardsInMonth = person.cards.filter((card) =>
                          personMonthLines.some((line) => line.cardId === card.cardId)
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

                            <div className="mt-3 space-y-3 pl-2">
                              {cardsInMonth.map((card) => {
                                const cardLines = personMonthLines.filter(
                                  (line) => line.cardId === card.cardId
                                );

                                return (
                                  <div key={card.cardId}>
                                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                      <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: card.cardColor }}
                                      />
                                      {card.cardName}
                                    </p>
                                    <ul className="mt-1 space-y-2">
                                      {cardLines.map((line) => (
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
                                              {URGENCY_BADGE[line.dueUrgency] && (
                                                <span
                                                  className={cn(
                                                    "rounded px-2 py-0.5 text-xs font-medium",
                                                    line.dueUrgency === "overdue"
                                                      ? "bg-red-100 text-red-700 dark:bg-red-950/50"
                                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/50"
                                                  )}
                                                >
                                                  {URGENCY_BADGE[line.dueUrgency]}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                              compra em {DATE_FORMATTER.format(new Date(line.purchaseDateISO))} ·
                                              parcela {line.installmentNumber} · vence em{" "}
                                              {DATE_FORMATTER.format(new Date(line.dueDateISO))}
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
                                  </div>
                                );
                              })}
                            </div>
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

      <div>
        <Link href="/purchases/new" className={buttonVariants({ variant: "outline" })}>
          Nova compra
        </Link>
      </div>
    </main>
  );
}
