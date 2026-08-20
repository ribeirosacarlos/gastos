"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { createPurchase } from "@/lib/actions/purchase-actions";
import {
  simulatePurchase,
  type SimulatedInstallment,
  type LimitCheck,
} from "@/lib/actions/simulation-actions";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/schemas";
import { CurrencyInput } from "@/components/currency-input";
import { InstallmentPreviewTable } from "@/components/installment-preview-table";
import { Button } from "@/components/ui/button";
import { centsToDisplay } from "@/lib/money";
import { getContrastTextColor } from "@/lib/utils";
import { DEFAULT_CATEGORY } from "@/lib/categories";
import { CategoryCombobox } from "@/components/category-combobox";
import {
  ParticipantPicker,
  type ParticipantCandidate,
} from "@/components/participant-picker";
import type { CategoryOption } from "@/lib/actions/category-actions";

interface CardOption {
  id: string;
  name: string;
  currency: string;
  color: string;
}

interface SimulateFormProps {
  cards: CardOption[];
  categories: CategoryOption[];
  defaultCardId?: string;
  participantCandidates: ParticipantCandidate[];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function SimulateForm({
  cards,
  categories,
  defaultCardId,
  participantCandidates,
}: SimulateFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [preview, setPreview] = useState<{
    installments: SimulatedInstallment[];
    limitCheck: LimitCheck;
  } | null>(null);

  const initialCardId =
    (defaultCardId && cards.some((c) => c.id === defaultCardId)
      ? defaultCardId
      : cards[0]?.id) ?? "";

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { isSubmitting },
  } = useForm<PurchaseInput>({
    defaultValues: {
      cardId: initialCardId,
      description: "",
      totalCents: 0,
      purchaseDate: new Date(todayIsoDate()),
      installmentsCount: 1,
      additionalParticipantUserIds: [],
      category: DEFAULT_CATEGORY,
    },
  });

  const cardId = useWatch({ control, name: "cardId" });
  const selectedCard = cards.find((c) => c.id === cardId);
  const currency = selectedCard?.currency ?? "BRL";

  async function handleCalculate(values: PurchaseInput) {
    setServerError(null);
    setPreview(null);

    const parsed = purchaseSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setIsCalculating(true);
    const result = await simulatePurchase(parsed.data);
    setIsCalculating(false);

    if ("error" in result) {
      setServerError(result.error);
      return;
    }

    setPreview(result);
  }

  async function handleConfirm() {
    setServerError(null);

    const parsed = purchaseSchema.safeParse(getValues());
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setIsConfirming(true);
    const result = await createPurchase(parsed.data);
    setIsConfirming(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Compra confirmada.");
    router.push("/purchases");
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit(handleCalculate)} className="space-y-4">
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

        {serverError && (
          <p className="text-sm text-red-600" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isCalculating}>
          {isCalculating ? "Calculando..." : "Calcular preview"}
        </Button>
      </form>

      {preview && (
        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-medium">Preview das parcelas</h2>
          <InstallmentPreviewTable
            installments={preview.installments}
            currency={currency}
          />

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Disponível antes
              </span>
              <span>
                {centsToDisplay(preview.limitCheck.availableBeforeCents, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Disponível depois
              </span>
              <span
                className={
                  preview.limitCheck.fits
                    ? undefined
                    : "font-medium text-red-600"
                }
              >
                {centsToDisplay(preview.limitCheck.availableAfterCents, currency)}
              </span>
            </div>
            {!preview.limitCheck.fits && (
              <p className="mt-1 text-xs font-medium text-red-600">
                Essa compra estoura o limite disponível do cartão.
              </p>
            )}
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleConfirm}
            disabled={isConfirming || isSubmitting}
          >
            {isConfirming ? "Confirmando..." : "Confirmar e criar compra"}
          </Button>
        </div>
      )}
    </div>
  );
}
