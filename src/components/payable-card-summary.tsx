import { centsToDisplay } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PayablePersonDueSummary } from "@/lib/actions/payable-actions";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const URGENCY_CARD_STYLES: Record<PayablePersonDueSummary["dueUrgency"], string> = {
  ok: "",
  soon: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
  overdue: "border-red-500 bg-red-50 dark:bg-red-950/30",
};

const URGENCY_LABELS: Record<PayablePersonDueSummary["dueUrgency"], string | null> = {
  ok: null,
  soon: "Vence em breve",
  overdue: "Fatura vencida",
};

// Card compacto do dashboard com o total que devo pagar pra uma pessoa
// (soma de todos os cartoes dela em que participo), usando o vencimento
// mais proximo entre esses cartoes pro aviso leve/forte.
export function PayableCardSummaryCard({ person }: { person: PayablePersonDueSummary }) {
  const label = URGENCY_LABELS[person.dueUrgency];

  return (
    <div className={cn("rounded-lg border p-4", URGENCY_CARD_STYLES[person.dueUrgency])}>
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <span className="truncate">Cartão {person.ownerName}</span>
        {label && (
          <span
            className={cn(
              "shrink-0 text-xs font-semibold",
              person.dueUrgency === "overdue" ? "text-red-600" : "text-amber-600"
            )}
          >
            {label}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        vence em {DATE_FORMATTER.format(new Date(person.dueDateISO))}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <span className="text-xs text-muted-foreground">Minha parte (≈ BRL)</span>
        <span className="text-sm font-semibold">
          {centsToDisplay(person.totalBRLCents, "BRL")}
        </span>
      </div>
    </div>
  );
}
