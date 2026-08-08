"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deactivateFixedExpense } from "@/lib/actions/fixed-expense-actions";
import { Button } from "@/components/ui/button";

export function DeactivateFixedExpenseButton({
  fixedExpenseId,
}: {
  fixedExpenseId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDeactivate() {
    setError(null);
    startTransition(async () => {
      const result = await deactivateFixedExpense(fixedExpenseId);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Gasto fixo desativado.");
      router.push("/fixed-expenses");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        onClick={handleDeactivate}
        disabled={isPending}
      >
        {isPending ? "Desativando..." : "Desativar"}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
