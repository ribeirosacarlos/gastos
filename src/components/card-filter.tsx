"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export interface CardFilterOption {
  id: string;
  name: string;
  color: string;
}

// Select que atualiza o ?cardId= na URL preservando os outros query params
// ja presentes (ex. ?category=), mesmo padrao de category-filter.tsx.
export function CardFilter({ cards }: { cards: CardFilterOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCardId = searchParams.get("cardId") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("cardId", e.target.value);
    } else {
      params.delete("cardId");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentCardId}
      onChange={handleChange}
      className="rounded-md border px-2 py-1 text-sm"
    >
      <option value="">Todos os cartões</option>
      {cards.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
