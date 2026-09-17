"use client";

import { useTransition } from "react";
import { centsToDisplay } from "@/lib/money";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CardLimit } from "@/lib/actions/dashboard-actions";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface LimitProgressBarProps {
  card: CardLimit;
  onPayInvoice: (cardId: string) => Promise<{ error?: string } | void>;
}

export function LimitProgressBar({ card, onPayInvoice }: LimitProgressBarProps) {
  const [isPending, startTransition] = useTransition();
  const isOverLimit = card.availableCents < 0;
  const rawPercentUsed =
    card.limitCents > 0 ? (card.usedCents / card.limitCents) * 100 : 0;
  const percentUsed = Math.min(100, Math.max(0, rawPercentUsed));

  const hasDueInvoice = card.dueInvoiceTotalCents > 0;
  const dueInvoicePaid = hasDueInvoice && card.dueInvoiceUnpaidCents === 0;
  const dueInvoiceLabel = `${MONTH_LABELS[card.dueInvoiceMonth - 1]}/${card.dueInvoiceYear}`;

  function handlePayInvoice() {
    startTransition(async () => {
      await onPayInvoice(card.cardId);
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="flex items-center gap-1.5 truncate">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: card.color }}
          />
          <span className="truncate">{card.name}</span>
        </span>
        <span
          className={cn(
            "shrink-0",
            isOverLimit ? "text-red-600" : "text-muted-foreground"
          )}
        >
          {centsToDisplay(card.availableCents, card.currency)} disponível
        </span>
      </div>

      <Progress value={percentUsed} className="mt-2">
        <ProgressTrack>
          <ProgressIndicator
            className={isOverLimit ? "bg-red-600" : undefined}
          />
        </ProgressTrack>
      </Progress>

      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Usado: {centsToDisplay(card.usedCents, card.currency)}</span>
        <span>Limite: {centsToDisplay(card.limitCents, card.currency)}</span>
      </div>

      {isOverLimit && (
        <p className="mt-1 text-xs font-medium text-red-600">
          Limite estourado
        </p>
      )}

      {hasDueInvoice && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            Fatura {dueInvoiceLabel}: {centsToDisplay(card.dueInvoiceTotalCents, card.currency)}
          </span>
          {dueInvoicePaid ? (
            <span className="text-xs font-medium text-green-600">Paga</span>
          ) : (
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={isPending}
              onClick={handlePayInvoice}
            >
              Marcar como paga
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
