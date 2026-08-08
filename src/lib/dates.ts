export interface YearMonth {
  year: number;
  month: number; // 1-12
}

// Se o dia da compra <= closingDay, cai na fatura do mes corrente da compra.
// Se > closingDay, cai no mes seguinte.
export function firstInvoiceMonth(
  purchaseDate: Date,
  closingDay: number
): YearMonth {
  const day = purchaseDate.getDate();
  const year = purchaseDate.getFullYear();
  const month = purchaseDate.getMonth() + 1; // 1-12

  if (day <= closingDay) {
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
