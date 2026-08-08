"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { createCard } from "@/lib/actions/card-actions";
import { cardSchema, type CardInput } from "@/lib/validation/schemas";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/money";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";

export default function NewCardPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<CardInput>({
    defaultValues: {
      name: "",
      bank: "",
      currency: DEFAULT_CURRENCY,
      limitCents: 0,
      closingDay: 1,
      dueDay: 10,
      color: "#64748b",
    },
  });

  const currency = useWatch({ control, name: "currency" });

  async function onSubmit(values: CardInput) {
    setServerError(null);

    const parsed = cardSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await createCard(parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Cartão criado.");
    router.push("/cards");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Novo cartão</h1>

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
    </main>
  );
}
