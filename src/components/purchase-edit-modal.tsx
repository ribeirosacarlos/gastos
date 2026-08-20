"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { updatePurchase } from "@/lib/actions/purchase-actions";
import {
  updatePurchaseSchema,
  type UpdatePurchaseInput,
} from "@/lib/validation/schemas";
import { CurrencyInput } from "@/components/currency-input";
import { CategoryCombobox } from "@/components/category-combobox";
import {
  ParticipantPicker,
  type ParticipantCandidate,
} from "@/components/participant-picker";
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

export interface EditableCardOption {
  id: string;
  name: string;
  currency: string;
  color: string;
}

export interface EditablePurchase {
  id: string;
  cardId: string;
  description: string;
  totalCents: number;
  purchaseDateISO: string;
  installmentsCount: number;
  additionalParticipantUserIds: string[];
  category: string;
  hasPaidInstallment: boolean;
}

interface PurchaseEditModalProps {
  purchase: EditablePurchase | null;
  cards: EditableCardOption[];
  categories: CategoryOption[];
  participantCandidates: ParticipantCandidate[];
  onOpenChange: (open: boolean) => void;
  onSaved: (purchaseId: string, values: UpdatePurchaseInput) => void;
}

// Modal de edicao rapida acionado a partir da listagem de /purchases (linha
// da tabela ou botao "Editar") - mesma logica de negocio de
// edit-purchase-form.tsx (bloqueio de valor/parcelas/data com parcela paga),
// mas fecha de volta pra listagem em vez de navegar pra uma pagina cheia.
export function PurchaseEditModal({
  purchase,
  cards,
  categories,
  participantCandidates,
  onOpenChange,
  onSaved,
}: PurchaseEditModalProps) {
  return (
    <Dialog open={purchase !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
        </DialogHeader>
        {purchase && (
          <PurchaseEditModalForm
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

function PurchaseEditModalForm({
  purchase,
  cards,
  categories,
  participantCandidates,
  onOpenChange,
  onSaved,
}: {
  purchase: EditablePurchase;
} & Omit<PurchaseEditModalProps, "purchase">) {
  const [serverError, setServerError] = useState<string | null>(null);
  const hasPaidInstallment = purchase.hasPaidInstallment;

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<UpdatePurchaseInput>({
    defaultValues: {
      cardId: purchase.cardId,
      description: purchase.description,
      totalCents: purchase.totalCents,
      purchaseDate: new Date(purchase.purchaseDateISO),
      installmentsCount: purchase.installmentsCount,
      additionalParticipantUserIds: purchase.additionalParticipantUserIds,
      category: purchase.category,
    },
  });

  const cardId = useWatch({ control, name: "cardId" });
  const selectedCard = cards.find((c) => c.id === cardId);
  const currency = selectedCard?.currency ?? "BRL";

  async function onSubmit(values: UpdatePurchaseInput) {
    setServerError(null);

    const parsed = updatePurchaseSchema.safeParse(values);
    if (!parsed.success) {
      setServerError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    const result = await updatePurchase(purchase.id, parsed.data);
    if (result.error) {
      setServerError(result.error);
      return;
    }

    toast.success("Compra atualizada.");
    onSaved(purchase.id, parsed.data);
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {hasPaidInstallment && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Esta compra já tem parcela paga: valor, nº de parcelas e data não
          podem ser alterados. Descrição, categoria, cartão e
          participantes continuam editáveis.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="modal-cardId" className="text-sm font-medium">
          Cartão
        </label>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: selectedCard?.color ?? "#64748b" }}
          />
          <select
            id="modal-cardId"
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
        <label htmlFor="modal-description" className="text-sm font-medium">
          Descrição
        </label>
        <input
          id="modal-description"
          type="text"
          autoFocus
          className="w-full rounded-md border px-3 py-2 text-sm"
          {...register("description", { required: true })}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="modal-category" className="text-sm font-medium">
          Categoria
        </label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryCombobox
              id="modal-category"
              value={field.value}
              onChange={field.onChange}
              categories={categories}
            />
          )}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="modal-totalCents" className="text-sm font-medium">
          Valor
        </label>
        <Controller
          control={control}
          name="totalCents"
          render={({ field }) => (
            <CurrencyInput
              id="modal-totalCents"
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
          <label htmlFor="modal-purchaseDate" className="text-sm font-medium">
            Data da compra
          </label>
          <Controller
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <input
                id="modal-purchaseDate"
                type="date"
                required
                value={
                  field.value
                    ? new Date(field.value).toISOString().slice(0, 10)
                    : ""
                }
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
          <label
            htmlFor="modal-installmentsCount"
            className="text-sm font-medium"
          >
            Nº de parcelas
          </label>
          <input
            id="modal-installmentsCount"
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

      <div className="space-y-1">
        <label htmlFor="modal-participants" className="text-sm font-medium">
          Dividir com
        </label>
        <Controller
          control={control}
          name="additionalParticipantUserIds"
          render={({ field }) => (
            <ParticipantPicker
              id="modal-participants"
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
