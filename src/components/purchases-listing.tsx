"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { centsToDisplay } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { DeletePurchaseButton } from "@/components/delete-purchase-button";
import {
  PurchaseEditModal,
  type EditableCardOption,
  type EditablePurchase,
} from "@/components/purchase-edit-modal";
import type { ParticipantCandidate } from "@/components/participant-picker";
import { CurrencyInput } from "@/components/currency-input";
import { updatePurchase } from "@/lib/actions/purchase-actions";
import type { UpdatePurchaseInput } from "@/lib/validation/schemas";
import type { CategoryOption } from "@/lib/actions/category-actions";
import { cn, getContrastTextColor } from "@/lib/utils";
import { toast } from "sonner";

export interface PurchaseRow {
  id: string;
  cardId: string;
  description: string;
  purchaseDateISO: string;
  category: string;
  totalCents: number;
  installmentsCount: number;
  ownerUserId: string;
  participants: ParticipantCandidate[];
  hasPaidInstallment: boolean;
}

interface PurchasesListingProps {
  purchases: PurchaseRow[];
  cards: EditableCardOption[];
  categories: CategoryOption[];
  participantCandidates: ParticipantCandidate[];
}

function otherParticipants(row: PurchaseRow): ParticipantCandidate[] {
  return row.participants.filter((p) => p.id !== row.ownerUserId);
}

type SortKey = "purchaseDate" | "description" | "cardName" | "categoryLabel" | "totalCents";
type SortDir = "asc" | "desc";
type View = "table" | "cards";
type CellField = "description" | "cardId" | "category" | "totalCents" | "purchaseDate";
type EditingCell = { rowId: string; field: CellField } | null;

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "purchaseDate", label: "Data" },
  { key: "description", label: "Descrição" },
  { key: "cardName", label: "Cartão" },
  { key: "categoryLabel", label: "Categoria" },
  { key: "totalCents", label: "Valor", className: "text-right" },
];

interface SortableRow {
  purchaseDateISO: string;
  description: string;
  cardName: string;
  categoryLabel: string;
  totalCents: number;
}

function compareRows(a: SortableRow, b: SortableRow, key: SortKey): number {
  if (key === "totalCents") return a.totalCents - b.totalCents;
  const field = key === "purchaseDate" ? "purchaseDateISO" : key;
  return String(a[field]).localeCompare(String(b[field]), "pt-BR", {
    sensitivity: "base",
  });
}

export function PurchasesListing({
  purchases,
  cards,
  categories,
  participantCandidates,
}: PurchasesListingProps) {
  const [rows, setRows] = useState(purchases);
  const [view, setView] = useState<View>("table");
  const [sortKey, setSortKey] = useState<SortKey>("purchaseDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const displayRows = useMemo(
    () =>
      rows.map((row) => {
        const card = cardsById.get(row.cardId);
        const category = categoriesById.get(row.category);
        return {
          ...row,
          cardName: card?.name ?? "—",
          cardColor: card?.color ?? "#64748b",
          cardCurrency: card?.currency ?? "BRL",
          categoryLabel: category?.name ?? row.category,
        };
      }),
    [rows, cardsById, categoriesById],
  );

  const sortedRows = useMemo(() => {
    const sorted = [...displayRows].sort((a, b) => compareRows(a, b, sortKey));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [displayRows, sortKey, sortDir]);

  const totalCents = useMemo(
    () => rows.reduce((sum, r) => sum + r.totalCents, 0),
    [rows],
  );

  const editingPurchase: EditablePurchase | null = useMemo(() => {
    const row = rows.find((r) => r.id === editingPurchaseId);
    return row
      ? {
          ...row,
          additionalParticipantUserIds: otherParticipants(row).map((p) => p.id),
        }
      : null;
  }, [rows, editingPurchaseId]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleModalSaved(purchaseId: string, values: UpdatePurchaseInput) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === purchaseId
          ? {
              ...r,
              cardId: values.cardId,
              description: values.description,
              totalCents: values.totalCents,
              purchaseDateISO: values.purchaseDate.toISOString(),
              installmentsCount: values.installmentsCount,
              category: values.category,
              participants: [
                ...r.participants.filter((p) => p.id === r.ownerUserId),
                ...values.additionalParticipantUserIds
                  .map((id) => participantCandidates.find((c) => c.id === id))
                  .filter((c): c is ParticipantCandidate => c !== undefined),
              ],
            }
          : r,
      ),
    );
  }

  function saveField(row: PurchaseRow, patch: Partial<UpdatePurchaseInput>) {
    setEditingCell(null);

    const payload: UpdatePurchaseInput = {
      cardId: row.cardId,
      description: row.description,
      totalCents: row.totalCents,
      purchaseDate: new Date(row.purchaseDateISO),
      installmentsCount: row.installmentsCount,
      additionalParticipantUserIds: otherParticipants(row).map((p) => p.id),
      category: row.category,
      ...patch,
    };

    startSaving(async () => {
      const result = await updatePurchase(row.id, payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                cardId: payload.cardId,
                description: payload.description,
                totalCents: payload.totalCents,
                purchaseDateISO: payload.purchaseDate.toISOString(),
                category: payload.category,
              }
            : r,
        ),
      );
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "compra" : "compras"} ·{" "}
          <span className="font-medium text-foreground">
            Total: {centsToDisplay(totalCents, "BRL")}
          </span>
        </p>
        <div className="inline-flex rounded-md border p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setView("table")}
            className={cn(
              "rounded px-3 py-1",
              view === "table" ? "bg-muted font-medium" : "text-muted-foreground",
            )}
          >
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setView("cards")}
            className={cn(
              "rounded px-3 py-1",
              view === "cards" ? "bg-muted font-medium" : "text-muted-foreground",
            )}
          >
            Cartões
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="p-0">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "flex w-full items-center gap-1 px-3 py-2 font-medium hover:text-foreground",
                        col.className === "text-right" && "justify-end",
                        sortKey === col.key ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <DateCell
                    row={row}
                    editing={editingCell?.rowId === row.id && editingCell.field === "purchaseDate"}
                    onStartEdit={() => setEditingCell({ rowId: row.id, field: "purchaseDate" })}
                    onCancel={() => setEditingCell(null)}
                    onSave={saveField}
                  />
                  <DescriptionCell
                    row={row}
                    editing={editingCell?.rowId === row.id && editingCell.field === "description"}
                    onStartEdit={() => setEditingCell({ rowId: row.id, field: "description" })}
                    onCancel={() => setEditingCell(null)}
                    onSave={saveField}
                  />
                  <CardCell
                    row={row}
                    cards={cards}
                    editing={editingCell?.rowId === row.id && editingCell.field === "cardId"}
                    onStartEdit={() => setEditingCell({ rowId: row.id, field: "cardId" })}
                    onCancel={() => setEditingCell(null)}
                    onSave={saveField}
                  />
                  <CategoryCell
                    row={row}
                    categories={categories}
                    editing={editingCell?.rowId === row.id && editingCell.field === "category"}
                    onStartEdit={() => setEditingCell({ rowId: row.id, field: "category" })}
                    onCancel={() => setEditingCell(null)}
                    onSave={saveField}
                  />
                  <ValorCell
                    row={row}
                    editing={editingCell?.rowId === row.id && editingCell.field === "totalCents"}
                    onStartEdit={() => setEditingCell({ rowId: row.id, field: "totalCents" })}
                    onCancel={() => setEditingCell(null)}
                    onSave={saveField}
                  />
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/purchases/${row.id}`}
                        title="Ver parcelas"
                        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                      >
                        <Receipt className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingPurchaseId(row.id)}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Editar
                      </button>
                      <DeletePurchaseButton purchaseId={row.id} size="sm" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium">
                <td className="px-3 py-2" colSpan={4}>
                  Total
                </td>
                <td className="px-3 py-2 text-right">
                  {centsToDisplay(totalCents, "BRL")}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <ul className="space-y-2">
          {sortedRows.map((row) => (
            <li key={row.id} className="rounded-lg border p-4">
              <button
                type="button"
                onClick={() => setEditingPurchaseId(row.id)}
                className="block w-full text-left hover:opacity-80"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{row.description}</span>
                  {otherParticipants(row).length > 0 && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      Dividida com{" "}
                      {otherParticipants(row)
                        .map((p) => p.name)
                        .join(", ")}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.cardColor }}
                    />
                    {row.cardName} · {row.categoryLabel} ·{" "}
                    {DATE_FORMATTER.format(new Date(row.purchaseDateISO))}
                  </span>
                  <span>
                    {centsToDisplay(row.totalCents, row.cardCurrency)} em{" "}
                    {row.installmentsCount}x
                  </span>
                </div>
              </button>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/purchases/${row.id}`}
                  title="Ver parcelas"
                  className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                >
                  <Receipt className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setEditingPurchaseId(row.id)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Editar
                </button>
                <DeletePurchaseButton purchaseId={row.id} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <PurchaseEditModal
        purchase={editingPurchase}
        cards={cards}
        categories={categories}
        participantCandidates={participantCandidates}
        onOpenChange={(open) => {
          if (!open) setEditingPurchaseId(null);
        }}
        onSaved={handleModalSaved}
      />
    </div>
  );
}

// --- Celulas inline-editaveis --------------------------------------------
// Clique numa celula troca ela por um input/select focado; salva no
// blur/onChange chamando updatePurchase com o payload completo (a action
// exige todos os campos - ver comentario em purchase-actions.ts). O modal
// completo (installments count, compartilhamento) fica so a um clique no
// botao "Editar" da coluna Acoes, ou no card inteiro na view mobile.

interface CellProps {
  row: PurchaseRow & { cardName: string; cardColor: string; cardCurrency: string; categoryLabel: string };
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (row: PurchaseRow, patch: Partial<UpdatePurchaseInput>) => void;
}

function DescriptionCell({ row, editing, onStartEdit, onCancel, onSave }: CellProps) {
  const cancelledRef = useRef(false);

  // Reseta a cada entrada no modo de edicao - sem isso, um Escape numa
  // sessao de edicao anterior deixaria a ref travada em `true` e a proxima
  // edicao dessa mesma celula nunca salvaria (mesma instancia do
  // componente, so o prop `editing` alterna, nao ha remount).
  useEffect(() => {
    if (editing) cancelledRef.current = false;
  }, [editing]);

  if (editing) {
    return (
      <td className="p-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          defaultValue={row.description}
          autoFocus
          className="w-full rounded-md border px-2 py-1 text-sm"
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              cancelledRef.current = true;
              e.currentTarget.blur();
            } else if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (cancelledRef.current || !value || value === row.description) {
              onCancel();
              return;
            }
            onSave(row, { description: value });
          }}
        />
      </td>
    );
  }

  return (
    <td
      className="cursor-text px-3 py-2 hover:bg-muted/40"
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {row.description}
      {otherParticipants(row).length > 0 && (
        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Dividida</span>
      )}
    </td>
  );
}

function CardCell({
  row,
  cards,
  editing,
  onStartEdit,
  onCancel,
  onSave,
}: CellProps & { cards: EditableCardOption[] }) {
  if (editing) {
    return (
      <td className="p-1" onClick={(e) => e.stopPropagation()}>
        <select
          autoFocus
          defaultValue={row.cardId}
          className="w-full rounded-md border px-2 py-1 text-sm"
          onBlur={onCancel}
          onChange={(e) => onSave(row, { cardId: e.target.value })}
        >
          {cards.map((c) => (
            <option
              key={c.id}
              value={c.id}
              style={{ backgroundColor: c.color, color: getContrastTextColor(c.color) }}
            >
              {c.name}
            </option>
          ))}
        </select>
      </td>
    );
  }

  return (
    <td
      className="cursor-pointer px-3 py-2 hover:bg-muted/40"
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: row.cardColor }}
        />
        {row.cardName}
      </span>
    </td>
  );
}

function CategoryCell({
  row,
  categories,
  editing,
  onStartEdit,
  onCancel,
  onSave,
}: CellProps & { categories: CategoryOption[] }) {
  if (editing) {
    return (
      <td className="p-1" onClick={(e) => e.stopPropagation()}>
        <select
          autoFocus
          defaultValue={row.category}
          className="w-full rounded-md border px-2 py-1 text-sm"
          onBlur={onCancel}
          onChange={(e) => onSave(row, { category: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
    );
  }

  return (
    <td
      className="cursor-pointer px-3 py-2 hover:bg-muted/40"
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {row.categoryLabel}
    </td>
  );
}

// CurrencyInput nao aceita autoFocus - foca e seleciona o input interno na
// montagem pra evitar um clique extra ao entrar no modo de edicao.
function AutoFocusWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = ref.current?.querySelector("input");
    input?.focus();
    input?.select();
  }, []);

  return <div ref={ref}>{children}</div>;
}

function ValorCell({ row, editing, onStartEdit, onCancel, onSave }: CellProps) {
  if (row.hasPaidInstallment) {
    return (
      <td
        className="whitespace-nowrap px-3 py-2 text-right text-muted-foreground"
        title="Parcela já paga: valor não pode ser alterado."
      >
        {centsToDisplay(row.totalCents, row.cardCurrency)}{" "}
        <span>em {row.installmentsCount}x</span>
      </td>
    );
  }

  if (editing) {
    return (
      <td className="p-1" onClick={(e) => e.stopPropagation()}>
        <AutoFocusWrapper>
          <CurrencyInput
            value={row.totalCents}
            currency={row.cardCurrency}
            onChange={(cents) => {
              if (cents <= 0 || cents === row.totalCents) {
                onCancel();
                return;
              }
              onSave(row, { totalCents: cents });
            }}
          />
        </AutoFocusWrapper>
      </td>
    );
  }

  return (
    <td
      className="cursor-text whitespace-nowrap px-3 py-2 text-right hover:bg-muted/40"
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {centsToDisplay(row.totalCents, row.cardCurrency)}{" "}
      <span className="text-muted-foreground">em {row.installmentsCount}x</span>
    </td>
  );
}

function DateCell({ row, editing, onStartEdit, onCancel, onSave }: CellProps) {
  if (row.hasPaidInstallment) {
    return (
      <td
        className="whitespace-nowrap px-3 py-2 text-muted-foreground"
        title="Parcela já paga: data não pode ser alterada."
      >
        {DATE_FORMATTER.format(new Date(row.purchaseDateISO))}
      </td>
    );
  }

  if (editing) {
    return (
      <td className="p-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          autoFocus
          defaultValue={row.purchaseDateISO.slice(0, 10)}
          className="w-full rounded-md border px-2 py-1 text-sm"
          onBlur={onCancel}
          onChange={(e) => {
            if (!e.target.value) return;
            onSave(row, {
              purchaseDate: new Date(`${e.target.value}T00:00:00.000Z`),
            });
          }}
        />
      </td>
    );
  }

  return (
    <td
      className="cursor-text whitespace-nowrap px-3 py-2 hover:bg-muted/40"
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {DATE_FORMATTER.format(new Date(row.purchaseDateISO))}
    </td>
  );
}
