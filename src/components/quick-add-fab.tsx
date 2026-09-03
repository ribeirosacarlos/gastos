"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { QuickAddSheet } from "@/components/quick-add-sheet";
import type { CategoryOption } from "@/lib/actions/category-actions";
import type { ParticipantCandidate } from "@/components/participant-picker";

interface CardOption {
  id: string;
  name: string;
  currency: string;
  color: string;
}

interface QuickAddFabProps {
  cards: CardOption[];
  categories: CategoryOption[];
  defaultCardId?: string;
  participantCandidates: ParticipantCandidate[];
}

export function QuickAddFab({
  cards,
  categories,
  defaultCardId,
  participantCandidates,
}: QuickAddFabProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filterCardId =
    pathname === "/purchases" ? (searchParams.get("cardId") ?? undefined) : undefined;
  const effectiveDefaultCardId =
    filterCardId && cards.some((c) => c.id === filterCardId)
      ? filterCardId
      : defaultCardId;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Lançamento rápido"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </button>
      <QuickAddSheet
        open={open}
        onOpenChange={setOpen}
        cards={cards}
        categories={categories}
        defaultCardId={effectiveDefaultCardId}
        participantCandidates={participantCandidates}
      />
    </>
  );
}
