export interface CurrencyConfig {
  code: string;
  label: string;
  symbol: string;
}

// Lista de moedas suportadas. String (nao enum do Prisma) por escolha de
// design: adicionar uma moeda nova = so incluir uma entrada aqui, sem
// migration. BRL e a moeda padrao do app.
export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "BRL", label: "Real", symbol: "R$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "Dólar", symbol: "$" },
];

export const DEFAULT_CURRENCY = "BRL";

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}

export function centsToDisplay(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

// Divide totalCents em n parcelas cuja soma bate exatamente com o total,
// sem perda por arredondamento: base = floor(total/n), resto (em centavos)
// distribuido 1 a 1 nas primeiras parcelas.
export function splitValue(totalCents: number, n: number): number[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("n deve ser um inteiro >= 1");
  }

  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;

  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

// userShareCents e convertToBRL (split 50/50 e cambio) entram nas Stories
// 1.6 (split/dashboard) e 1.7 (cambio) - fora do escopo desta story.
