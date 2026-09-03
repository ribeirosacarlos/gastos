"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getContrastTextColor } from "@/lib/utils";
import type { CategoryOption } from "@/lib/actions/category-actions";
import type { EditableCardOption, EditablePurchase } from "@/components/purchase-edit-modal";

interface PurchaseDuplicateModalProps {
  purchase: EditablePurchase | null;
  cards: EditableCardOption[];
  categories: CategoryOption[];
  participantCandidates: ParticipantCandidate[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

// Modal de duplicacao acionado a partir da listagem de /purchases (botao
// "Duplicar") - mesmo layout de PurchaseEditModal, mas cria uma compra nova
// e independente (createPurchase) em vez de editar a original, entao nao
// reaplica o bloqueio de hasPaidInstallment (a compra original nunca e
// alvo de mutacao aqui).
export function PurchaseDuplicateModal({
  purchase,
  cards,
  categories,
  participantCandidates,
  onOpenChange,
  onSaved,
}: PurchaseDuplicateModalProps) {
  return (
    <Dialog open={purchase !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar compra</DialogTitle>
        </DialogHeader>
        {purchase && (
          <PurchaseDuplicateModalForm
            key={purchase.id}
            purchase={purchase}
            cards={cards}
            categories={categories}
            participantCandidates={participantCandidates}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PurchaseDuplicateModalForm({
  purchase,
  cards,
  categories,
  participantCandidates,
  onOpenChange,
  onSaved,
}: {
  purchase: EditablePurchase;
} & Omit<PurchaseDuplicateModalProps, "purchase">) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<PurchaseInput>({
    defaultValues: {
      cardId: purchase.cardId,
      description: purchase.description,
      totalCents: purchase.totalCents,
      purchaseDate: new Date(purchase.purchaseDateISO),
      installmentsCount: purchase.installmentsCount,
      additionalParticipantUserIds: purchase.additionalParticipantUserIds,
      chargedUserId: purchase.chargedUserId,
      category: purchase.category,
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

    toast.success("Compra duplicada.");
    onSaved();
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="duplicate-cardId" className="text-sm font-medium">
          Cartão
        </label>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: selectedCard?.color ?? "#64748b" }}
          />
          <select
            id="duplicate-cardId"
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
        <label htmlFor="duplicate-description" className="text-sm font-medium">
          Descrição
        </label>
        <input
          id="duplicate-description"
          type="text"
          autoFocus
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("description", { required: true })}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="duplicate-category" className="text-sm font-medium">
          Categoria
        </label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryCombobox
              id="duplicate-category"
              value={field.value}
              onChange={field.onChange}
              categories={categories}
            />
          )}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="duplicate-totalCents" className="text-sm font-medium">
          Valor
        </label>
        <Controller
          control={control}
          name="totalCents"
          render={({ field }) => (
            <CurrencyInput
              id="duplicate-totalCents"
              currency={currency}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="duplicate-purchaseDate" className="text-sm font-medium">
            Data da compra
          </label>
          <Controller
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <input
                id="duplicate-purchaseDate"
                type="date"
                required
                value={
                  field.value
                    ? new Date(field.value).toISOString().slice(0, 10)
                    : ""
                }
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
            htmlFor="duplicate-installmentsCount"
            className="text-sm font-medium"
          >
            Nº de parcelas
          </label>
          <input
            id="duplicate-installmentsCount"
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
        <label htmlFor="duplicate-participants" className="text-sm font-medium">
          Dividir com
        </label>
        <Controller
          control={control}
          name="additionalParticipantUserIds"
          render={({ field }) => (
            <ParticipantPicker
              id="duplicate-participants"
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
            id="duplicate-chargedUserId"
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
