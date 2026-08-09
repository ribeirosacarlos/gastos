"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SUPPORTED_CATEGORIES } from "@/lib/categories";

// Select que atualiza o ?category= na URL preservando os outros query
// params ja presentes (ex. ?cardId=), sem precisar de um <form> completo.
export function CategoryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("category", e.target.value);
    } else {
      params.delete("category");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentCategory}
      onChange={handleChange}
      className="rounded-md border px-2 py-1 text-sm"
    >
      <option value="">Todas as categorias</option>
      {SUPPORTED_CATEGORIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
