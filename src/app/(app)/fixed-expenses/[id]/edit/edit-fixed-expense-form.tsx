"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { updateFixedExpense } from "@/lib/actions/fixed-expense-actions";
import {
  updateFixedExpenseSchema,
  type UpdateFixedExpenseInput,
} from "@/lib/validation/schemas";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { CurrencyInput } from "@/components/currency-input";
import { CategoryCombobox } from "@/components/category-combobox";
import { Button } from "@/components/ui/button";
import type { CategoryOption } from "@/lib/actions/category-actions";

interface EditFixedExpenseFormProps {
  fixedExpenseId: string;
  categories: CategoryOption[];
  hasPaidInstallment: boolean;
  otherUserName?: string;
  defaultValues: UpdateFixedExpenseInput;
}

export function EditFixedExpenseForm({
  fixedExpenseId,
  categories,
  hasPaidInstallment,
  otherUserName,
  defaultValues,
}: EditFixedExpenseFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isIndefinite, setIsIndefinite] = useState(
    defaultValues.totalInstallments == null
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<UpdateFixedExpenseInput>({ defaultValues });

  const currency = useWatch({ control, name: "currency" });
  const isShared = useWatch({ control, name: "isShared" });

  async function onSubmit(values: UpdateFixedExpenseInput) {
    setServerError(null);

    const payload: UpdateFixedExpenseInput = {
      ...values,
      totalInstallments: isIndefinite ? null : values.totalInstallments,
    };

    const parsed = updateFixedExpenseSchema.safeParse(payload);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await updateFixedExpense(fixedExpenseId, parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Gasto fixo atualizado.");
    router.push(`/fixed-expenses/${fixedExpenseId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {hasPaidInstallment && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Este gasto fixo já tem parcela paga: valor, nº de parcelas e
          mês/ano inicial não podem ser alterados. Descrição, categoria,
          moeda e compartilhamento continuam editáveis.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>
        <input
          id="description"
          type="text"
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("description", { required: true })}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="currency" className="text-sm font-medium">
          Moeda
        </label>
        <select
          id="currency"
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("currency")}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({c.code})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="category" className="text-sm font-medium">
          Categoria
        </label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryCombobox
              id="category"
              value={field.value}
              onChange={field.onChange}
              categories={categories}
            />
          )}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="valueCents" className="text-sm font-medium">
          Valor (por mês/parcela)
        </label>
        <Controller
          control={control}
          name="valueCents"
          render={({ field }) => (
            <CurrencyInput
              id="valueCents"
              currency={currency}
              value={field.value}
              onChange={field.onChange}
              disabled={hasPaidInstallment}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="startMonth" className="text-sm font-medium">
            Mês inicial
          </label>
          <input
            id="startMonth"
            type="number"
            min={1}
            max={12}
            disabled={hasPaidInstallment}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            {...register("startMonth", {
              valueAsNumber: true,
              required: true,
            })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="startYear" className="text-sm font-medium">
            Ano inicial
          </label>
          <input
            id="startYear"
            type="number"
            disabled={hasPaidInstallment}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            {...register("startYear", {
              valueAsNumber: true,
              required: true,
            })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isIndefinite}
          disabled={hasPaidInstallment}
          onChange={(e) => setIsIndefinite(e.target.checked)}
        />
        Indefinido (sem data pra acabar, ex. aluguel)
      </label>

      {!isIndefinite && (
        <div className="space-y-1">
          <label htmlFor="totalInstallments" className="text-sm font-medium">
            Nº de parcelas
          </label>
          <input
            id="totalInstallments"
            type="number"
            min={1}
            disabled={hasPaidInstallment}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            {...register("totalInstallments", {
              valueAsNumber: true,
            })}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isShared")} />
        Gasto compartilhado (conta 50/50 pros dois)
      </label>
      {isShared && otherUserName && (
        <p className="text-xs text-muted-foreground">
          Compartilhando com: {otherUserName}
        </p>
      )}

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
