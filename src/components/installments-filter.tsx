"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function InstallmentsFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentValue = searchParams.get("installments") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("installments", e.target.value);
    } else {
      params.delete("installments");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="rounded-md border px-2 py-1 text-sm"
    >
      <option value="">Todas as compras</option>
      <option value="multi">Só parceladas</option>
    </select>
  );
}
