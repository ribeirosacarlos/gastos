"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveCategory } from "@/lib/actions/category-actions";
import { Button } from "@/components/ui/button";
import type { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface ArchiveCategoryButtonProps
  extends Pick<VariantProps<typeof buttonVariants>, "size"> {
  categoryId: string;
  redirectTo?: string;
}

export function ArchiveCategoryButton({
  categoryId,
  redirectTo,
  size,
}: ArchiveCategoryButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    if (
      !window.confirm(
        "Excluir esta categoria? Compras e gastos fixos já lançados com ela continuam normalmente, ela só deixa de aparecer nas opções pra novos lançamentos."
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await archiveCategory(categoryId);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Categoria excluída.");
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
        onClick={handleArchive}
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
