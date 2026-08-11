import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCategories } from "@/lib/actions/category-actions";
import { buttonVariants } from "@/components/ui/button";
import { CategoryList } from "./category-list";

export default async function CategoriesPage() {
  await requireUser();

  const categories = await listCategories();

  return (
    <main className="mx-auto max-w-sm p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <Link href="/categories/new" className={buttonVariants()}>
          Nova categoria
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria cadastrada ainda.
        </p>
      ) : (
        <CategoryList categories={categories} />
      )}
    </main>
  );
}
