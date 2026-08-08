"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { updateCard } from "@/lib/actions/card-actions";
import {
  updateCardSchema,
  type UpdateCardInput,
} from "@/lib/validation/schemas";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";

interface EditCardFormProps {
  cardId: string;
  currency: string;
  defaultValues: UpdateCardInput;
}

export function EditCardForm({
  cardId,
  currency,
  defaultValues,
}: EditCardFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<UpdateCardInput>({ defaultValues });

  async function onSubmit(values: UpdateCardInput) {
    setServerError(null);

    const parsed = updateCardSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await updateCard(cardId, parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Cartão atualizado.");
    router.push(`/cards/${cardId}`);
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
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("name", { required: true })}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="bank" className="text-sm font-medium">
          Banco
        </label>
        <input
          id="bank"
          type="text"
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("bank", { required: true })}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Moeda: {currency} (não editável)
      </p>

      <div className="space-y-1">
        <label htmlFor="color" className="text-sm font-medium">
          Cor
        </label>
        <input
          id="color"
          type="color"
          className="h-9 w-16 rounded-md border p-1"
          {...register("color")}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="limitCents" className="text-sm font-medium">
          Limite
        </label>
        <Controller
          control={control}
          name="limitCents"
          render={({ field }) => (
            <CurrencyInput
              id="limitCents"
              currency={currency}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="closingDay" className="text-sm font-medium">
            Dia de fechamento
          </label>
          <input
            id="closingDay"
            type="number"
            min={1}
            max={31}
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register("closingDay", {
              valueAsNumber: true,
              required: true,
            })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="dueDay" className="text-sm font-medium">
            Dia de vencimento
          </label>
          <input
            id="dueDay"
            type="number"
            min={1}
            max={31}
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register("dueDay", { valueAsNumber: true, required: true })}
          />
        </div>
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
