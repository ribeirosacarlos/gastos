export interface YearMonth {
  year: number;
  month: number; // 1-12
}

// Se o dia da compra < closingDay, cai na fatura do mes corrente da compra.
// Se >= closingDay (incluindo o proprio dia do fechamento), cai no mes
// seguinte - confirmado contra faturas reais (Nubank fechamento dia 5,
// Santander dia 1: compras feitas exatamente nesse dia sempre apareceram
// na fatura seguinte, nunca na do mes corrente).
export function firstInvoiceMonth(
  purchaseDate: Date,
  closingDay: number
): YearMonth {
  const day = purchaseDate.getDate();
  const year = purchaseDate.getFullYear();
  const month = purchaseDate.getMonth() + 1; // 1-12

  if (day < closingDay) {
    return { year, month };
  }

  return addMonths({ year, month }, 1);
}

// Aritmetica pura de meses (sem usar Date) para evitar bugs de fuso/DST.
export function addMonths(base: YearMonth, offset: number): YearMonth {
  const totalMonths = base.year * 12 + (base.month - 1) + offset;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return { year, month };
}

export function generateInstallmentMonths(
  first: YearMonth,
  count: number
): YearMonth[] {
  return Array.from({ length: count }, (_, i) => addMonths(first, i));
}

// A fatura "corrente" pra fins de compra (firstInvoiceMonth) e a que ainda
// esta aberta, acumulando; a que se paga agora e a anterior a essa (ja
// fechou no closingDay deste ciclo). Ex.: closingDay=10, hoje dia 15 ->
// firstInvoiceMonth retorna o mes que vem (aberta) -> fatura devida = mes
// atual (fechou hoje ha 5 dias).
export function dueInvoiceMonth(today: Date, closingDay: number): YearMonth {
  return addMonths(firstInvoiceMonth(today, closingDay), -1);
}

// Data real (ano/mes/dia) de vencimento de uma fatura de referencia
// (referenceYear/referenceMonth de PurchaseInstallment) + dueDay do cartao.
// Usa UTC (sem Date local) pelo mesmo motivo de addMonths: evitar bug de
// fuso/DST. dueDay e clampado ao ultimo dia do mes de referencia (ex.:
// dueDay=31 em fevereiro cai no ultimo dia real do mes).
export function invoiceDueDate(
  referenceYear: number,
  referenceMonth: number,
  dueDay: number
): Date {
  const daysInMonth = new Date(Date.UTC(referenceYear, referenceMonth, 0)).getUTCDate();
  const day = Math.min(dueDay, daysInMonth);
  return new Date(Date.UTC(referenceYear, referenceMonth - 1, day));
}

export type DueUrgency = "ok" | "soon" | "overdue";

// Classifica a proximidade do vencimento: "overdue" se a data ja passou,
// "soon" se falta ate warnDays dias (aviso leve), "ok" caso contrario.
// Compara so a parte de data (sem horario) pra nao marcar "overdue" no
// proprio dia do vencimento.
export function getDueUrgency(
  dueDate: Date,
  today: Date = new Date(),
  warnDays: number = 5
): DueUrgency {
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const dueUTC = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate()
  );
  const diffDays = Math.round((dueUTC - todayUTC) / 86_400_000);

  if (diffDays < 0) return "overdue";
  if (diffDays <= warnDays) return "soon";
  return "ok";
}
