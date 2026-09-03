"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Input que atualiza o ?month=yyyy-MM na URL preservando os outros query
// params ja presentes. Em /purchases, esse mes representa a fatura
// (referenceYear/referenceMonth das parcelas), nao a data original da compra.
// Input nativo type=month controlado (value sempre vem da URL) - evita o bug
// de defaultValue + type=date/month nao sobrevivendo a hidratacao.
export function MonthFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMonth = searchParams.get("month") ?? "";

  function setMonth(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("month", value);
    } else {
      params.delete("month");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="month"
        value={currentMonth}
        onChange={(e) => setMonth(e.target.value)}
        aria-label="Filtrar por mês da fatura"
        className="rounded-md border px-2 py-1 text-sm"
      />
      {currentMonth && (
        <button
          type="button"
          onClick={() => setMonth("")}
          className="text-xs text-muted-foreground underline"
        >
          limpar
        </button>
      )}
    </div>
  );
}
