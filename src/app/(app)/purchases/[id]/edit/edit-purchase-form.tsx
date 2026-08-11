"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { updatePurchase } from "@/lib/actions/purchase-actions";
import {
  updatePurchaseSchema,
  type UpdatePurchaseInput,
} from "@/lib/validation/schemas";
import { CurrencyInput } from "@/components/currency-input";
import { CategoryCombobox } from "@/components/category-combobox";
import { Button } from "@/components/ui/button";
import { getContrastTextColor } from "@/lib/utils";
import type { CategoryOption } from "@/lib/actions/category-actions";

interface CardOption {
  id: string;
  name: string;
  currency: string;
  color: string;
}

interface EditPurchaseFormProps {
  purchaseId: string;
  cards: CardOption[];
  categories: CategoryOption[];
  hasPaidInstallment: boolean;
  otherUserName?: string;
  defaultValues: UpdatePurchaseInput;
}

function toIsoDate(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function EditPurchaseForm({
  purchaseId,
  cards,
  categories,
  hasPaidInstallment,
  otherUserName,
  defaultValues,
}: EditPurchaseFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<UpdatePurchaseInput>({ defaultValues });

  const cardId = useWatch({ control, name: "cardId" });
  const selectedCard = cards.find((c) => c.id === cardId);
  const currency = selectedCard?.currency ?? "BRL";
  const isShared = useWatch({ control, name: "isShared" });

  async function onSubmit(values: UpdatePurchaseInput) {
    setServerError(null);

    const parsed = updatePurchaseSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await updatePurchase(purchaseId, parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Compra atualizada.");
    router.push(`/purchases/${purchaseId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {hasPaidInstallment && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Esta compra já tem parcela paga: valor, nº de parcelas e data não
          podem ser alterados. Descrição, categoria, cartão e compartilhamento
          continuam editáveis.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="cardId" className="text-sm font-medium">
          Cartão
        </label>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: selectedCard?.color ?? "#64748b" }}
          />
          <select
            id="cardId"
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register("cardId", { required: true })}
          >
            {cards.map((c) => (
              <option
                key={c.id}
                value={c.id}
                style={{
                  backgroundColor: c.color,
                  color: getContrastTextColor(c.color),
                }}
              >
                {c.name}
                {c.currency !== "BRL" ? ` (${c.currency})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

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
        <label htmlFor="totalCents" className="text-sm font-medium">
          Valor
        </label>
        <Controller
          control={control}
          name="totalCents"
          render={({ field }) => (
            <CurrencyInput
              id="totalCents"
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
          <label htmlFor="purchaseDate" className="text-sm font-medium">
            Data da compra
          </label>
          <Controller
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <input
                id="purchaseDate"
                type="date"
                required
                value={field.value ? toIsoDate(field.value) : ""}
                disabled={hasPaidInstallment}
                className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onChange={(e) =>
                  field.onChange(
                    e.target.value
                      ? new Date(`${e.target.value}T00:00:00.000Z`)
                      : undefined
                  )
                }
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="installmentsCount" className="text-sm font-medium">
            Nº de parcelas
          </label>
          <input
            id="installmentsCount"
            type="number"
            min={1}
            disabled={hasPaidInstallment}
            className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            {...register("installmentsCount", {
              valueAsNumber: true,
              required: true,
            })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isShared")} />
        Compra compartilhada (conta 50/50 pros dois)
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
