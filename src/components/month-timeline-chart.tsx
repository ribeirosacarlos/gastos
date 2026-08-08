import { centsToDisplay } from "@/lib/money";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export interface MonthBarData {
  year: number;
  month: number; // 1-12
  purchasesBRLCents: number;
  fixedBRLCents: number;
}

interface MonthTimelineChartProps {
  data: MonthBarData[];
}

// Barras via Tailwind puro - sem biblioteca de graficos (nao ha nenhuma no
// stack aprovado, ver Dev Notes da Story 1.8). Tema do app e monocromatico
// (tokens grayscale, sem matiz), entao a distincao entre os dois segmentos
// usa tom + opacidade + legenda/rotulo, nunca so cor - mesmo criterio de
// "identidade nunca so por cor" recomendado pra paletas coloridas.
export function MonthTimelineChart({ data }: MonthTimelineChartProps) {
  const totals = data.map((d) => d.purchasesBRLCents + d.fixedBRLCents);
  const maxTotal = Math.max(1, ...totals);

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
          Parcelado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/40" />
          Fixo
        </span>
      </div>

      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {data.map((d, i) => {
          const total = totals[i];
          const heightPercent = (total / maxTotal) * 100;
          const purchasesPercent =
            total > 0 ? (d.purchasesBRLCents / total) * 100 : 0;
          const fixedPercent = total > 0 ? (d.fixedBRLCents / total) * 100 : 0;

          return (
            <div
              key={`${d.year}-${d.month}`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="text-[0.65rem] text-muted-foreground">
                {total > 0 ? centsToDisplay(total, "BRL") : ""}
              </span>
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm"
                style={{ height: `${heightPercent}%`, minHeight: total > 0 ? 4 : 0 }}
                title={`${MONTH_LABELS[d.month - 1]}/${d.year} — Parcelado: ${centsToDisplay(
                  d.purchasesBRLCents,
                  "BRL"
                )} · Fixo: ${centsToDisplay(d.fixedBRLCents, "BRL")}`}
              >
                {d.purchasesBRLCents > 0 && (
                  <div
                    className="w-full bg-primary"
                    style={{ height: `${purchasesPercent}%` }}
                  />
                )}
                {d.fixedBRLCents > 0 && (
                  <div
                    className="mt-0.5 w-full bg-primary/40"
                    style={{ height: `${fixedPercent}%` }}
                  />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {MONTH_LABELS[d.month - 1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
