"use client";

import { useState } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

interface CurrencyInputProps {
  id?: string;
  name?: string;
  value: number; // em centavos
  currency: string;
  onChange: (cents: number) => void;
  disabled?: boolean;
}

function centsToInputString(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Aceita tanto "1500,00" (BR) quanto "1500.00" (US) como separador decimal.
// Mascara com separador de milhar automatico fica pro passo de Polish do
// plano (nao e escopo desta story).
function parseToCents(raw: string): number {
  const cleaned = raw.trim();
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  let normalized: string;
  if (decimalIndex === -1) {
    normalized = cleaned.replace(/[^\d-]/g, "");
  } else {
    const intPart = cleaned.slice(0, decimalIndex).replace(/[^\d-]/g, "");
    const decPart = cleaned
      .slice(decimalIndex + 1)
      .replace(/[^\d]/g, "")
      .padEnd(2, "0")
      .slice(0, 2);
    normalized = `${intPart}.${decPart}`;
  }

  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function CurrencyInput({
  id,
  name,
  value,
  currency,
  onChange,
  disabled,
}: CurrencyInputProps) {
  const [text, setText] = useState(() => centsToInputString(value));
  const [lastValue, setLastValue] = useState(value);

  // Ajusta o texto exibido quando o valor externo muda (ex.: reset de form),
  // sem passar por useEffect - setState direto no corpo do render e o padrao
  // recomendado pelo React para "adjusting state when a prop changes".
  if (value !== lastValue) {
    setLastValue(value);
    setText(centsToInputString(value));
  }

  const symbol =
    SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;

  function handleBlur() {
    const cents = parseToCents(text);
    onChange(cents);
    setText(centsToInputString(cents));
  }

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{symbol}</span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        className="w-full bg-transparent outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}
