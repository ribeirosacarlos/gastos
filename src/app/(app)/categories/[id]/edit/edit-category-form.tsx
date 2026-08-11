"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateCategory } from "@/lib/actions/category-actions";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";

interface EditCategoryFormProps {
  categoryId: string;
  defaultValues: CategoryInput;
}

export function EditCategoryForm({
  categoryId,
  defaultValues,
}: EditCategoryFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CategoryInput>({ defaultValues });

  async function onSubmit(values: CategoryInput) {
    setServerError(null);

    const parsed = categorySchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await updateCategory(categoryId, parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Categoria atualizada.");
    router.push("/categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="name"
          type="text"
          autoFocus
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("name", { required: true })}
        />
      </div>

      {serverError && (
        <p className="text-sm text-red-600" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
