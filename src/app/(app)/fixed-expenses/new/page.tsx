"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { createFixedExpense } from "@/lib/actions/fixed-expense-actions";
import {
  fixedExpenseSchema,
  type FixedExpenseInput,
} from "@/lib/validation/schemas";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/money";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function NewFixedExpensePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isIndefinite, setIsIndefinite] = useState(true);

  const { year, month } = currentYearMonth();

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<FixedExpenseInput>({
    defaultValues: {
      description: "",
      valueCents: 0,
      currency: DEFAULT_CURRENCY,
      startYear: year,
      startMonth: month,
      totalInstallments: null,
      isShared: false,
    },
  });

  const currency = useWatch({ control, name: "currency" });

  async function onSubmit(values: FixedExpenseInput) {
    setServerError(null);

    const payload: FixedExpenseInput = {
      ...values,
      totalInstallments: isIndefinite ? null : values.totalInstallments,
    };

    const parsed = fixedExpenseSchema.safeParse(payload);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await createFixedExpense(parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Gasto fixo criado.");
    router.push("/fixed-expenses");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Novo gasto fixo</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              className="w-full rounded-md border px-3 py-2 text-sm"
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
              className="w-full rounded-md border px-3 py-2 text-sm"
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
            onChange={(e) => setIsIndefinite(e.target.checked)}
          />
          Indefinido (sem data pra acabar, ex. aluguel)
        </label>

        {!isIndefinite && (
          <div className="space-y-1">
            <label
              htmlFor="totalInstallments"
              className="text-sm font-medium"
            >
              Nº de parcelas
            </label>
            <input
              id="totalInstallments"
              type="number"
              min={1}
              className="w-full rounded-md border px-3 py-2 text-sm"
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
