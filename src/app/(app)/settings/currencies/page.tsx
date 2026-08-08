import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { CurrencyRateRow } from "@/components/currency-rate-row";

export default async function CurrenciesSettingsPage() {
  await requireUser();

  const rates = await db.exchangeRate.findMany();
  const rateByCurrency = new Map(rates.map((r) => [r.currency, r]));

  const nonBrlCurrencies = SUPPORTED_CURRENCIES.filter(
    (c) => c.code !== "BRL"
  );

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-1 text-xl font-semibold">Câmbio</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Taxas usadas pra calcular o total combinado aproximado em BRL no
        dashboard. BRL é sempre a referência (taxa implícita = 1).
      </p>

      <ul className="space-y-2">
        <li className="rounded-lg border p-4 text-sm text-muted-foreground">
          Real (BRL) · taxa 1,0000 (implícita, sem edição)
        </li>

        {nonBrlCurrencies.map((c) => {
          const rate = rateByCurrency.get(c.code);
          return (
            <CurrencyRateRow
              key={c.code}
              currency={c.code}
              label={c.label}
              rateToBRL={rate?.rateToBRL ?? null}
              source={rate?.source ?? null}
              updatedAt={rate?.updatedAt.toISOString() ?? null}
            />
          );
        })}
      </ul>
    </main>
  );
}
