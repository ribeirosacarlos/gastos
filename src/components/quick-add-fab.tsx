"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { QuickAddSheet } from "@/components/quick-add-sheet";

interface CardOption {
  id: string;
  name: string;
  currency: string;
  color: string;
}

interface QuickAddFabProps {
  cards: CardOption[];
  defaultCardId?: string;
  otherUserName?: string;
}

export function QuickAddFab({
  cards,
  defaultCardId,
  otherUserName,
}: QuickAddFabProps) {
  const [open, setOpen] = useState(false);

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
        defaultCardId={defaultCardId}
        otherUserName={otherUserName}
      />
    </>
  );
}
