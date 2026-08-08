"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  fetchExchangeRateFromApi,
  updateExchangeRateManually,
} from "@/lib/actions/exchange-rate-actions";
import { Button } from "@/components/ui/button";

interface CurrencyRateRowProps {
  currency: string;
  label: string;
  rateToBRL: number | null;
  source: string | null;
  updatedAt: string | null;
}

export function CurrencyRateRow({
  currency,
  label,
  rateToBRL,
  source,
  updatedAt,
}: CurrencyRateRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState(
    rateToBRL !== null ? String(rateToBRL) : ""
  );

  function handleFetchFromApi() {
    setError(null);
    startTransition(async () => {
      const result = await fetchExchangeRateFromApi(currency);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateExchangeRateManually({
        currency,
        rateToBRL: Number(manualValue),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {label} ({currency})
        </span>
        <span className="text-sm text-muted-foreground">
          {rateToBRL !== null
            ? `1 ${currency} ≈ R$ ${rateToBRL.toFixed(4)}`
            : "não cadastrada"}
        </span>
      </div>

      {rateToBRL !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Fonte: {source === "api" ? "API" : "manual"}
          {updatedAt &&
            ` · Atualizada em ${new Date(updatedAt).toLocaleString("pt-BR")}`}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleFetchFromApi}
          disabled={isPending}
        >
          {isPending ? "Atualizando..." : "Atualizar via API"}
        </Button>

        <form
          onSubmit={handleManualSubmit}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            inputMode="decimal"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Taxa manual"
            className="w-28 rounded-md border px-2 py-1 text-sm"
          />
          <Button type="submit" size="sm" disabled={isPending}>
            Salvar
          </Button>
        </form>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
