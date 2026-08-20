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

// Converte centavos de uma moeda estrangeira para centavos equivalentes em
// BRL usando a taxa vigente (ExchangeRate.rateToBRL). BRL nunca passa por
// aqui - sua taxa e implicitamente 1 (sem registro na tabela).
export function convertToBRL(cents: number, rateToBRL: number): number {
  return Math.round(cents * rateToBRL);
}

// Metade (arredondada pra baixo) de um valor compartilhado - usado so por
// FixedExpense, que mantem o modelo binario isShared (fora do escopo da
// divisao entre N participantes, ver Purchase/splitAmongParticipants).
export function userShareCents(valueCents: number, isShared: boolean): number {
  return isShared ? Math.floor(valueCents / 2) : valueCents;
}

// Divide valueCents igualmente entre todos os participantes de uma compra,
// sem perda de centavos (reusa splitValue). orderedUserIds[0] deve ser
// sempre o dono da compra - e quem absorve o(s) centavo(s) de resto,
// deterministicamente, em vez de depender da ordem de retorno do banco.
// A visibilidade de quem pode ver a linha (dono ou participante) e
// responsabilidade da query, nao desta funcao.
export function splitAmongParticipants(
  valueCents: number,
  orderedUserIds: string[]
): Record<string, number> {
  const shares = splitValue(valueCents, orderedUserIds.length);
  return Object.fromEntries(orderedUserIds.map((userId, i) => [userId, shares[i]]));
}
