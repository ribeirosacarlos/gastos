"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveCard } from "@/lib/actions/card-actions";
import { Button } from "@/components/ui/button";

export function ArchiveCardButton({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveCard(cardId);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Cartão arquivado.");
      router.push("/cards");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        onClick={handleArchive}
        disabled={isPending}
      >
        {isPending ? "Arquivando..." : "Arquivar"}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
