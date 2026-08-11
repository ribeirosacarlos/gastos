"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Select que atualiza o ?month=yyyy-MM na URL (mes da purchaseDate, nao da
// fatura/parcela) preservando os outros query params ja presentes, mesmo
// padrao de category-filter.tsx e card-filter.tsx. Input nativo type=month
// controlado (value sempre vem da URL) - evita o bug de defaultValue +
// type=date/month nao sobrevivendo a hidratacao (ver Story 1.14 fix).
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
