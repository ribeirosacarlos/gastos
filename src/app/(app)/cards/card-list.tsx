"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { centsToDisplay } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { ArchiveCardButton } from "@/components/archive-card-button";

export interface CardListItem {
  id: string;
  name: string;
  bank: string;
  color: string;
  currency: string;
  limitCents: number;
  closingDay: number;
  dueDay: number;
}

type SortOption = "dueDay" | "name" | "limit";

const SORT_LABELS: Record<SortOption, string> = {
  dueDay: "Vencimento (mais próximo primeiro)",
  name: "Nome (A-Z)",
  limit: "Limite (maior primeiro)",
};

// Dias corridos ate o proximo vencimento (so o dia do mes e guardado, sem
// mes/ano - calcula a distancia a partir de hoje, avançando pro mes
// seguinte quando o dia ja passou neste mes).
function daysUntilDue(dueDay: number, today: Date): number {
  const todayDay = today.getDate();
  const daysInCurrentMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const clampedDueDay = Math.min(dueDay, daysInCurrentMonth);

  if (clampedDueDay >= todayDay) {
    return clampedDueDay - todayDay;
  }
  return daysInCurrentMonth - todayDay + clampedDueDay;
}

function sortCards(cards: CardListItem[], sortBy: SortOption): CardListItem[] {
  const today = new Date();
  const sorted = [...cards];

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    case "limit":
      return sorted.sort((a, b) => b.limitCents - a.limitCents);
    case "dueDay":
    default:
      return sorted.sort(
        (a, b) => daysUntilDue(a.dueDay, today) - daysUntilDue(b.dueDay, today)
      );
  }
}

export function CardList({ cards }: { cards: CardListItem[] }) {
  const [sortBy, setSortBy] = useState<SortOption>("dueDay");

  const sortedCards = useMemo(() => sortCards(cards, sortBy), [cards, sortBy]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2 text-sm">
        <label htmlFor="sortBy" className="text-muted-foreground">
          Ordenar por
        </label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-md border px-2 py-1 text-sm"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-2">
        {sortedCards.map((card) => (
          <li key={card.id} className="rounded-lg border p-4">
            <Link href={`/cards/${card.id}`} className="block hover:opacity-80">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: card.color }}
                  />
                  {card.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {card.bank}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span>
                  Limite: {centsToDisplay(card.limitCents, card.currency)}
                </span>
                <span>
                  Fecha dia {card.closingDay} / Vence dia {card.dueDay}
                </span>
              </div>
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/cards/${card.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Editar
              </Link>
              <ArchiveCardButton cardId={card.id} size="sm" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
