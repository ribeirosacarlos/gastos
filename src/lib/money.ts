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

// splitValue, userShareCents e convertToBRL (logica de parcelamento, split
// 50/50 e cambio) entram nas Stories 1.4 (parcelas) e 1.7 (cambio) - fora do
// escopo desta story (CRUD de Cartoes).
