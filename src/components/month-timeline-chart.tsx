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

// Cor neutra fixa pro segmento de gastos fixos (nao tem cartao, entao nao
// tem cor propria) - mesmo tom usado no aviso/badge "Inativo" em outras
// telas (bg-muted-foreground).
const FIXED_EXPENSES_COLOR = "#94a3b8";
const FIXED_EXPENSES_KEY = "__fixed__";

export interface ChartSegment {
  key: string;
  label: string;
  color: string;
  valueBRLCents: number;
}

export interface MonthBarData {
  year: number;
  month: number; // 1-12
  segments: ChartSegment[];
}

interface MonthTimelineChartProps {
  data: MonthBarData[];
}

interface LegendEntry {
  key: string;
  label: string;
  color: string;
  totalCents: number;
  percent: number;
}

function buildLegend(data: MonthBarData[]): LegendEntry[] {
  const totals = new Map<string, { label: string; color: string; total: number }>();
  let grandTotal = 0;

  for (const month of data) {
    for (const seg of month.segments) {
      if (seg.valueBRLCents <= 0) continue;
      const existing = totals.get(seg.key);
      if (existing) {
        existing.total += seg.valueBRLCents;
      } else {
        totals.set(seg.key, { label: seg.label, color: seg.color, total: seg.valueBRLCents });
      }
      grandTotal += seg.valueBRLCents;
    }
  }

  return Array.from(totals.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      color: v.color,
      totalCents: v.total,
      percent: grandTotal > 0 ? (v.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

// Barras via Tailwind puro - sem biblioteca de graficos (nao ha nenhuma no
// stack aprovado, ver Dev Notes da Story 1.8). Segmentos dinamicos por
// cartao (cor propria) + "Fixos" (cor neutra fixa) - Story 1.11.
//
// IMPORTANTE (bug corrigido na Story 1.8): a coluna de cada mes precisa de
// h-full explicito - senao a altura em % das barras colapsa a 0, porque
// height:% so funciona com container de altura definida (o pai teria
// altura "auto" sem isso, por causa do items-end no container das colunas).
export function MonthTimelineChart({ data }: MonthTimelineChartProps) {
  const totals = data.map((d) =>
    d.segments.reduce((sum, s) => sum + s.valueBRLCents, 0)
  );
  const maxTotal = Math.max(1, ...totals);
  const legend = buildLegend(data);

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {data.map((d, i) => {
          const total = totals[i];
          const heightPercent = (total / maxTotal) * 100;

          return (
            <div
              key={`${d.year}-${d.month}`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[0.65rem] text-muted-foreground">
                {total > 0 ? centsToDisplay(total, "BRL") : ""}
              </span>
              <div
                className="flex w-full flex-col justify-end gap-0.5 overflow-hidden rounded-t-sm"
                style={{ height: `${heightPercent}%`, minHeight: total > 0 ? 4 : 0 }}
              >
                {d.segments
                  .filter((seg) => seg.valueBRLCents > 0)
                  .map((seg) => (
                    <div
                      key={seg.key}
                      className="w-full"
                      style={{
                        height: `${(seg.valueBRLCents / total) * 100}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${seg.label} — ${MONTH_LABELS[d.month - 1]}/${d.year}: ${centsToDisplay(seg.valueBRLCents, "BRL")}`}
                    />
                  ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {MONTH_LABELS[d.month - 1]}
              </span>
            </div>
          );
        })}
      </div>

      {legend.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {legend.map((entry) => (
            <span key={entry.key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label} ({entry.percent.toFixed(0)}%)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { FIXED_EXPENSES_COLOR, FIXED_EXPENSES_KEY };
