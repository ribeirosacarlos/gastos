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
  return formatWithThousands((cents / 100).toFixed(2).replace(".", ","));
}

// Decide onde fica o separador decimal num texto que pode ter os pontos de
// milhar da mascara (Story 1.10) misturados com um valor colado (ex.
// "1500.00", formato US). Regra: virgula sempre e decimal se presente; um
// unico ponto com ate 2 digitos depois (e nenhuma virgula) tambem e tratado
// como decimal (compatibilidade com colar valores US); qualquer outro caso
// de ponto(s) e so separador de milhar, descartado na hora de extrair digitos.
function splitIntAndDecimalDigits(raw: string): {
  intDigits: string;
  decDigits?: string;
} {
  const commaIndex = raw.lastIndexOf(",");
  const dotIndex = raw.lastIndexOf(".");
  const dotCount = (raw.match(/\./g) ?? []).length;

  const dotIsDecimal =
    commaIndex === -1 && dotCount === 1 && raw.length - dotIndex - 1 <= 2;
  const decimalIndex =
    commaIndex !== -1 ? commaIndex : dotIsDecimal ? dotIndex : -1;

  if (decimalIndex === -1) {
    return { intDigits: raw.replace(/\D/g, "") };
  }

  return {
    intDigits: raw.slice(0, decimalIndex).replace(/\D/g, ""),
    decDigits: raw
      .slice(decimalIndex + 1)
      .replace(/\D/g, "")
      .slice(0, 2),
  };
}

// Formata o valor digitado com separador de milhar (pt-BR) em tempo real,
// mantendo a parte decimal exatamente como o usuario esta digitando (sem
// preencher com zero antes do blur).
function formatWithThousands(raw: string): string {
  const { intDigits, decDigits } = splitIntAndDecimalDigits(raw);
  const grouped = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decDigits === undefined ? grouped : `${grouped},${decDigits}`;
}

function parseToCents(raw: string): number {
  const cleaned = raw.trim();
  if (!cleaned) return 0;

  const { intDigits, decDigits } = splitIntAndDecimalDigits(cleaned);
  const normalized = `${intDigits || "0"}.${(decDigits ?? "").padEnd(2, "0").slice(0, 2)}`;

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
        onChange={(e) => setText(formatWithThousands(e.target.value))}
        onBlur={handleBlur}
      />
    </div>
  );
}
