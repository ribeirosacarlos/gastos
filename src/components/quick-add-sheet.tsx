"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { createPurchase } from "@/lib/actions/purchase-actions";
import { purchaseSchema, type PurchaseInput } from "@/lib/validation/schemas";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CardOption[];
  categories: CategoryOption[];
  defaultCardId?: string;
  participantCandidates: ParticipantCandidate[];
}

const DEFAULT_DESCRIPTION = "Gasto rápido";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

function defaultValues(initialCardId: string): PurchaseInput {
  return {
    cardId: initialCardId,
    description: DEFAULT_DESCRIPTION,
    totalCents: 0,
    purchaseDate: new Date(todayIsoDate()),
    installmentsCount: 1,
    additionalParticipantUserIds: [],
    category: DEFAULT_CATEGORY,
  };
}

export function QuickAddSheet({
  open,
  onOpenChange,
  cards,
  categories,
  defaultCardId,
  participantCandidates,
}: QuickAddSheetProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const initialCardId =
    (defaultCardId && cards.some((c) => c.id === defaultCardId)
      ? defaultCardId
      : cards[0]?.id) ?? "";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<PurchaseInput>({
    defaultValues: defaultValues(initialCardId),
  });

  const cardId = useWatch({ control, name: "cardId" });
  const selectedCard = cards.find((c) => c.id === cardId);
  const currency = selectedCard?.currency ?? "BRL";

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setServerError(null);
      setShowMoreOptions(false);
      reset(defaultValues(initialCardId));
    }
    onOpenChange(nextOpen);
  }

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

    toast.success("Gasto registrado.");
    setShowMoreOptions(false);
    reset(defaultValues(initialCardId));
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Lançamento rápido</SheetTitle>
        </SheetHeader>

        {cards.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">
            Você ainda não tem nenhum cartão ativo. Cadastre um cartão
            primeiro.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 px-4 pb-4"
          >
            <div className="space-y-1">
              <label htmlFor="qa-totalCents" className="text-sm font-medium">
                Valor
              </label>
              <Controller
                control={control}
                name="totalCents"
                render={({ field }) => (
                  <CurrencyInput
                    id="qa-totalCents"
                    currency={currency}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="qa-cardId" className="text-sm font-medium">
                Cartão
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedCard?.color ?? "#64748b" }}
                />
                <select
                  id="qa-cardId"
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
              <label htmlFor="qa-purchaseDate" className="text-sm font-medium">
                Data
              </label>
              <Controller
                control={control}
                name="purchaseDate"
                render={({ field }) => (
                  <input
                    id="qa-purchaseDate"
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
              <label
                htmlFor="qa-description"
                className="text-sm font-medium"
              >
                Descrição
              </label>
              <input
                id="qa-description"
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm"
                {...register("description", { required: true })}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="qa-category" className="text-sm font-medium">
                Categoria
              </label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <CategoryCombobox
                    id="qa-category"
                    value={field.value}
                    onChange={field.onChange}
                    categories={categories}
                  />
                )}
              />
            </div>

            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={() => setShowMoreOptions((v) => !v)}
            >
              {showMoreOptions ? "Menos opções" : "Mais opções"}
            </button>

            {showMoreOptions && (
              <div className="space-y-4 rounded-md border p-3">
                <div className="space-y-1">
                  <label
                    htmlFor="qa-installmentsCount"
                    className="text-sm font-medium"
                  >
                    Nº de parcelas
                  </label>
                  <input
                    id="qa-installmentsCount"
                    type="number"
                    min={1}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    {...register("installmentsCount", {
                      valueAsNumber: true,
                      required: true,
                    })}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="qa-participants" className="text-sm font-medium">
                    Dividir com
                  </label>
                  <Controller
                    control={control}
                    name="additionalParticipantUserIds"
                    render={({ field }) => (
                      <ParticipantPicker
                        id="qa-participants"
                        value={field.value}
                        onChange={field.onChange}
                        candidates={participantCandidates}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {serverError && (
              <p className="text-sm text-red-600" role="alert">
                {serverError}
              </p>
            )}

            <SheetFooter className="px-0">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
