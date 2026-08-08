"use client";

import { useTransition } from "react";
import { centsToDisplay } from "@/lib/money";

export interface InstallmentPreviewItem {
  id?: string;
  installmentNumber: number;
  referenceYear: number;
  referenceMonth: number; // 1-12
  valueCents: number;
  paid?: boolean;
}

interface InstallmentPreviewTableProps {
  installments: InstallmentPreviewItem[];
  currency: string;
  // Ausente = tabela so de preview (ex.: Simulacao, Story 1.9), sem interacao.
  onTogglePaid?: (installmentId: string) => Promise<{ error?: string } | void>;
}

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function InstallmentPreviewTable({
  installments,
  currency,
  onTogglePaid,
}: InstallmentPreviewTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string) {
    if (!onTogglePaid) return;
    startTransition(async () => {
      await onTogglePaid(id);
    });
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-2">#</th>
          <th className="py-2 pr-2">Mês</th>
          <th className="py-2 pr-2">Valor</th>
          {onTogglePaid && <th className="py-2">Status</th>}
        </tr>
      </thead>
      <tbody>
        {installments.map((item) => (
          <tr key={item.id ?? item.installmentNumber} className="border-b">
            <td className="py-2 pr-2">{item.installmentNumber}</td>
            <td className="py-2 pr-2">
              {MONTH_LABELS[item.referenceMonth - 1]}/{item.referenceYear}
            </td>
            <td className="py-2 pr-2">
              {centsToDisplay(item.valueCents, currency)}
            </td>
            {onTogglePaid && item.id && (
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => handleToggle(item.id!)}
                  disabled={isPending}
                  className={
                    item.paid
                      ? "font-medium text-green-600"
                      : "text-muted-foreground"
                  }
                >
                  {item.paid ? "Paga" : "Pendente"}
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
