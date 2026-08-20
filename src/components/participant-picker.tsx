"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createParticipant } from "@/lib/actions/participant-actions";
import { cn } from "@/lib/utils";

export interface ParticipantCandidate {
  id: string;
  name: string;
}

interface ParticipantPickerProps {
  id?: string;
  // IDs dos participantes adicionais selecionados (o dono nunca aparece
  // aqui - e sempre implicito, ver Req-10 da spec).
  value: string[];
  onChange: (ids: string[]) => void;
  candidates: ParticipantCandidate[];
  disabled?: boolean;
}

// Combobox com busca + selecao multipla: digitar filtra os candidatos ainda
// nao selecionados; se o texto nao bater com ninguem, mostra a opcao
// "Criar participante" que chama createParticipant (cria um User real, com
// login) e ja adiciona a selecao. Mesmo padrao de interacao do
// CategoryCombobox (fechar ao clicar fora, Enter seleciona/cria, Escape
// fecha), adaptado pra multi-selecao com chips.
export function ParticipantPicker({
  id,
  value,
  onChange,
  candidates: initialCandidates,
  disabled,
}: ParticipantPickerProps) {
  const listboxId = useId();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [prevInitialCandidates, setPrevInitialCandidates] =
    useState(initialCandidates);
  if (initialCandidates !== prevInitialCandidates) {
    setPrevInitialCandidates(initialCandidates);
    setCandidates(initialCandidates);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = candidates.filter((c) => value.includes(c.id));
  const selectable = candidates.filter((c) => !value.includes(c.id));

  const trimmedQuery = query.trim();
  const filtered = trimmedQuery
    ? selectable.filter((c) =>
        c.name.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
    : selectable;
  const hasExactMatch = candidates.some(
    (c) => c.name.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreateOption = trimmedQuery.length > 0 && !hasExactMatch;

  function handleSelect(candidate: ParticipantCandidate) {
    onChange([...value, candidate.id]);
    setQuery("");
  }

  function handleRemove(candidateId: string) {
    onChange(value.filter((id) => id !== candidateId));
  }

  async function handleCreate() {
    if (!trimmedQuery || isCreating) return;

    setIsCreating(true);
    const result = await createParticipant({ name: trimmedQuery });
    setIsCreating(false);

    if ("error" in result) return;

    const created = result.participant;
    setCandidates((prev) =>
      prev.some((c) => c.id === created.id)
        ? prev
        : [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    );
    handleSelect(created);
  }

  return (
    <div ref={containerRef} className="relative">
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((candidate) => (
            <span
              key={candidate.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium"
            >
              {candidate.name}
              <button
                type="button"
                aria-label={`Remover ${candidate.name}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => handleRemove(candidate.id)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        autoComplete="off"
        disabled={disabled}
        placeholder="Adicionar participante..."
        className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length > 0) {
              handleSelect(filtered[0]);
            } else if (showCreateOption) {
              handleCreate();
            }
          }
        }}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md"
        >
          {filtered.length === 0 && !showCreateOption && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {selectable.length === 0
                ? "Nenhum outro participante disponível."
                : "Nenhum participante encontrado."}
            </li>
          )}
          {filtered.map((candidate) => (
            <li key={candidate.id} role="option" aria-selected={false}>
              <button
                type="button"
                className={cn(
                  "block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(candidate)}
              >
                {candidate.name}
              </button>
            </li>
          ))}
          {showCreateOption && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-sm text-primary hover:bg-muted disabled:opacity-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCreate}
                disabled={isCreating}
              >
                <Plus className="h-3.5 w-3.5" />
                {isCreating
                  ? "Criando..."
                  : `Criar participante "${trimmedQuery}"`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
