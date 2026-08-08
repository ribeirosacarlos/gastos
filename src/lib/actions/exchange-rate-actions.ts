"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  exchangeRateSchema,
  type ExchangeRateInput,
} from "@/lib/validation/schemas";

export type UpdateExchangeRateResult = { error?: string };

export async function updateExchangeRateManually(
  input: ExchangeRateInput
): Promise<UpdateExchangeRateResult> {
  await requireUser();

  const parsed = exchangeRateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { currency, rateToBRL } = parsed.data;

  await db.exchangeRate.upsert({
    where: { currency },
    create: { currency, rateToBRL, source: "manual" },
    update: { rateToBRL, source: "manual" },
  });

  revalidatePath("/settings/currencies");
  return {};
}

export type FetchExchangeRateResult = { error?: string };

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function fetchExchangeRateFromApi(
  currency: string
): Promise<FetchExchangeRateResult> {
  await requireUser();

  const parsed = exchangeRateSchema.shape.currency.safeParse(currency);
  if (!parsed.success) {
    return { error: "Moeda não suportada." };
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${parsed.data}&symbols=BRL`
    );

    if (!response.ok) {
      return { error: "Não foi possível buscar a taxa (serviço indisponível)." };
    }

    const data = (await response.json()) as FrankfurterResponse;
    const rateToBRL = data.rates?.BRL;

    if (typeof rateToBRL !== "number" || !Number.isFinite(rateToBRL)) {
      return { error: "Resposta inesperada do serviço de câmbio." };
    }

    await db.exchangeRate.upsert({
      where: { currency: parsed.data },
      create: { currency: parsed.data, rateToBRL, source: "api" },
      update: { rateToBRL, source: "api" },
    });

    revalidatePath("/settings/currencies");
    return {};
  } catch {
    return { error: "Falha de rede ao buscar a taxa. A taxa anterior foi mantida." };
  }
}
