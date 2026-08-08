import { centsToDisplay } from "@/lib/money";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import type { CardLimit } from "@/lib/actions/dashboard-actions";

export function LimitProgressBar({ card }: { card: CardLimit }) {
  const isOverLimit = card.availableCents < 0;
  const rawPercentUsed =
    card.limitCents > 0 ? (card.usedCents / card.limitCents) * 100 : 0;
  const percentUsed = Math.min(100, Math.max(0, rawPercentUsed));

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{card.name}</span>
        <span className={isOverLimit ? "text-red-600" : "text-muted-foreground"}>
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
    </div>
  );
}
