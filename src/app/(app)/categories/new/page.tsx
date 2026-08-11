"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createCategory } from "@/lib/actions/category-actions";
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";

export default function NewCategoryPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CategoryInput>({ defaultValues: { name: "" } });

  async function onSubmit(values: CategoryInput) {
    setServerError(null);

    const parsed = categorySchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await createCategory(parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Categoria criada.");
    router.push("/categories");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/categories" label="Voltar para categorias" />
      <h1 className="mb-4 text-xl font-semibold">Nova categoria</h1>

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
    </main>
  );
}
