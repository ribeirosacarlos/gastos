"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { createPurchase } from "@/lib/actions/purchase-actions";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/schemas";
import { CurrencyInput } from "@/components/currency-input";
import { CategoryCombobox } from "@/components/category-combobox";
import {
  ParticipantPicker,
  type ParticipantCandidate,
} from "@/components/participant-picker";
import { PurchaseChargeSelect } from "@/components/purchase-charge-select";
import { Button } from "@/components/ui/button";
import { getContrastTextColor } from "@/lib/utils";
import { DEFAULT_CATEGORY } from "@/lib/categories";
import type { CategoryOption } from "@/lib/actions/category-actions";

interface CardOption {
  id: string;
  name: string;
  currency: string;
  color: string;
}

interface NewPurchaseFormProps {
  cards: CardOption[];
  categories: CategoryOption[];
  defaultCardId?: string;
  participantCandidates: ParticipantCandidate[];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// input type=date so aceita "yyyy-MM-dd" em UTC - toISOString cobre isso
// direto ja que purchaseDate sempre e gravado como meia-noite UTC.
function toIsoDate(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function NewPurchaseForm({
  cards,
  categories,
  defaultCardId,
  participantCandidates,
}: NewPurchaseFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const initialCardId =
    (defaultCardId && cards.some((c) => c.id === defaultCardId)
      ? defaultCardId
      : cards[0]?.id) ?? "";

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<PurchaseInput>({
    defaultValues: {
      cardId: initialCardId,
      description: "",
      totalCents: 0,
      purchaseDate: new Date(todayIsoDate()),
      installmentsCount: 1,
      additionalParticipantUserIds: [],
      chargedUserId: null,
      category: DEFAULT_CATEGORY,
    },
  });

  const cardId = useWatch({ control, name: "cardId" });
  const watchedAdditionalParticipantUserIds = useWatch({
    control,
    name: "additionalParticipantUserIds",
  });
  const additionalParticipantUserIds = useMemo(
    () => watchedAdditionalParticipantUserIds ?? [],
    [watchedAdditionalParticipantUserIds]
  );
  const chargedUserId = useWatch({ control, name: "chargedUserId" });
  const selectedCard = cards.find((c) => c.id === cardId);
  const currency = selectedCard?.currency ?? "BRL";

  useEffect(() => {
    if (
      chargedUserId &&
      (additionalParticipantUserIds.length !== 1 ||
        !additionalParticipantUserIds.includes(chargedUserId))
    ) {
      setValue("chargedUserId", null, { shouldDirty: true });
    }
  }, [additionalParticipantUserIds, chargedUserId, setValue]);

  async function onSubmit(values: PurchaseInput) {
    setServerError(null);

    const parsed = purchaseSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await createPurchase(parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Compra registrada.");
    reset({
      cardId: values.cardId,
      description: "",
      totalCents: 0,
      purchaseDate: new Date(todayIsoDate()),
      installmentsCount: 1,
      additionalParticipantUserIds: [],
      chargedUserId: null,
      category: DEFAULT_CATEGORY,
    });
    router.refresh();
  }

  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Você ainda não tem nenhum cartão ativo. Cadastre um cartão primeiro.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          placeholder="Se vazio, usa o nome da categoria"
          {...register("description")}
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
                className="w-full rounded-md border px-3 py-2 text-sm"
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
            className="w-full rounded-md border px-3 py-2 text-sm"
            {...register("installmentsCount", {
              valueAsNumber: true,
              required: true,
            })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="participants" className="text-sm font-medium">
          Dividir com
        </label>
        <Controller
          control={control}
          name="additionalParticipantUserIds"
          render={({ field }) => (
            <ParticipantPicker
              id="participants"
              value={field.value}
              onChange={field.onChange}
              candidates={participantCandidates}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="chargedUserId"
        render={({ field }) => (
          <PurchaseChargeSelect
            id="chargedUserId"
            participantIds={additionalParticipantUserIds}
            candidates={participantCandidates}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

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
