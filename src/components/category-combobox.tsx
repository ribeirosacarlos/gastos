"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  createCategory,
  type CategoryOption,
} from "@/lib/actions/category-actions";
import { cn } from "@/lib/utils";

interface CategoryComboboxProps {
  id?: string;
  value: string;
  onChange: (categoryId: string) => void;
  categories: CategoryOption[];
  disabled?: boolean;
}

// Select com busca: filtra a lista conforme digita e, se o texto digitado
// nao bater com nenhuma categoria existente, mostra uma opcao "+ Adicionar"
// que cria a categoria na hora (createCategory e idempotente por nome, ver
// category-actions.ts) e ja seleciona ela.
export function CategoryCombobox({
  id,
  value,
  onChange,
  categories: initialCategories,
  disabled,
}: CategoryComboboxProps) {
  const listboxId = useId();
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState(
    () => initialCategories.find((c) => c.id === value)?.name ?? ""
  );
  // Texto usado pra filtrar a lista, separado do `query` (texto exibido no
  // input). Sem essa separacao, abrir o combobox com uma categoria ja
  // selecionada (ex. "Outros") filtraria a lista pelo proprio nome da
  // selecao atual, escondendo quase todas as opcoes - reseta pra "" toda
  // vez que o dropdown abre, so passa a filtrar de fato quando o usuario
  // comeca a digitar.
  const [filterText, setFilterText] = useState("");
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ajuste de estado durante a renderizacao (padrao recomendado pelo React
  // pra sincronizar state com props sem o custo de um efeito + render
  // extra) - guarda o ultimo prop visto em vez de rodar setState num
  // useEffect. So mexe no texto exibido quando o dropdown esta fechado,
  // senao um reset no meio da digitacao atrapalharia o usuario.
  const [prevInitialCategories, setPrevInitialCategories] =
    useState(initialCategories);
  const [prevValue, setPrevValue] = useState(value);
  if (initialCategories !== prevInitialCategories) {
    setPrevInitialCategories(initialCategories);
    setCategories(initialCategories);
    if (!open) {
      setQuery(initialCategories.find((c) => c.id === value)?.name ?? "");
    }
  }
  if (!open && value !== prevValue) {
    setPrevValue(value);
    setQuery(categories.find((c) => c.id === value)?.name ?? "");
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

  const trimmedQuery = filterText.trim();
  const filtered = trimmedQuery
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
    : categories;
  const hasExactMatch = categories.some(
    (c) => c.name.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreateOption = trimmedQuery.length > 0 && !hasExactMatch;

  function handleSelect(category: CategoryOption) {
    setQuery(category.name);
    setPrevValue(category.id);
    onChange(category.id);
    setOpen(false);
  }

  async function handleCreate() {
    if (!trimmedQuery || isCreating) return;

    setIsCreating(true);
    const result = await createCategory({ name: trimmedQuery });
    setIsCreating(false);

    if (result.error || !result.category) return;

    const created = result.category;
    setCategories((prev) =>
      prev.some((c) => c.id === created.id)
        ? prev
        : [...prev, created].sort((a, b) =>
            a.name.localeCompare(b.name, "pt-BR")
          )
    );
    handleSelect(created);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        autoComplete="off"
        disabled={disabled}
        className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        value={query}
        onFocus={(e) => {
          setOpen(true);
          setFilterText("");
          e.target.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setFilterText(e.target.value);
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
              Nenhuma categoria encontrada.
            </li>
          )}
          {filtered.map((category) => (
            <li key={category.id} role="option" aria-selected={category.id === value}>
              <button
                type="button"
                className={cn(
                  "block w-full px-3 py-2 text-left text-sm hover:bg-muted",
                  category.id === value && "bg-muted font-medium"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(category)}
              >
                {category.name}
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
                {isCreating ? "Adicionando..." : `Adicionar "${trimmedQuery}"`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
