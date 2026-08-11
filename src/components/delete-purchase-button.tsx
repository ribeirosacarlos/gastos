"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePurchase } from "@/lib/actions/purchase-actions";
import { Button } from "@/components/ui/button";
import type { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface DeletePurchaseButtonProps
  extends Pick<VariantProps<typeof buttonVariants>, "size"> {
  purchaseId: string;
  redirectTo?: string;
}

export function DeletePurchaseButton({
  purchaseId,
  redirectTo,
  size,
}: DeletePurchaseButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm("Excluir esta compra? Essa ação não pode ser desfeita.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deletePurchase(purchaseId);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Compra excluída.");
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
        onClick={handleDelete}
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
