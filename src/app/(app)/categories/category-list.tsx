"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArchiveCategoryButton } from "@/components/archive-category-button";
import type { CategoryOption } from "@/lib/actions/category-actions";

export function CategoryList({ categories }: { categories: CategoryOption[] }) {
  return (
    <ul className="space-y-2">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <span className="font-medium">{category.name}</span>
          <div className="flex items-center gap-2">
            <Link
              href={`/categories/${category.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Editar
            </Link>
            <ArchiveCategoryButton categoryId={category.id} size="sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}
