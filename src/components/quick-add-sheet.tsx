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

interface CardOption {
  id: string;
  name: string;
  currency: string;
}

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CardOption[];
  defaultCardId?: string;
  otherUserName?: string;
}

const DEFAULT_DESCRIPTION = "Gasto rápido";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultValues(initialCardId: string): PurchaseInput {
  return {
    cardId: initialCardId,
    description: DEFAULT_DESCRIPTION,
    totalCents: 0,
    purchaseDate: new Date(todayIsoDate()),
    installmentsCount: 1,
    isShared: false,
  };
}

export function QuickAddSheet({
  open,
  onOpenChange,
  cards,
  defaultCardId,
  otherUserName,
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
  const isShared = useWatch({ control, name: "isShared" });

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
              <select
                id="qa-cardId"
                className="w-full rounded-md border px-3 py-2 text-sm"
                {...register("cardId", { required: true })}
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="qa-purchaseDate" className="text-sm font-medium">
                Data
              </label>
              <input
                id="qa-purchaseDate"
                type="date"
                defaultValue={todayIsoDate()}
                className="w-full rounded-md border px-3 py-2 text-sm"
                {...register("purchaseDate", {
                  valueAsDate: true,
                  required: true,
                })}
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

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("isShared")} />
                  Compra compartilhada (conta 50/50 pros dois)
                </label>
                {isShared && otherUserName && (
                  <p className="text-xs text-muted-foreground">
                    Compartilhando com: {otherUserName}
                  </p>
                )}
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
