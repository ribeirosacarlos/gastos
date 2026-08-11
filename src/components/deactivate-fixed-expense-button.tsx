"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deactivateFixedExpense } from "@/lib/actions/fixed-expense-actions";
import { Button } from "@/components/ui/button";
import type { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface DeactivateFixedExpenseButtonProps
  extends Pick<VariantProps<typeof buttonVariants>, "size"> {
  fixedExpenseId: string;
  redirectTo?: string;
}

export function DeactivateFixedExpenseButton({
  fixedExpenseId,
  redirectTo,
  size,
}: DeactivateFixedExpenseButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDeactivate() {
    if (
      !window.confirm(
        "Excluir este gasto fixo? Essa ação não pode ser desfeita."
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deactivateFixedExpense(fixedExpenseId);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Gasto fixo excluído.");
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        size={size}
        onClick={handleDeactivate}
        disabled={isPending}
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
