import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BackLink } from "@/components/back-link";
import { EditCategoryForm } from "./edit-category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();

  const category = await db.category.findUnique({ where: { id } });

  if (!category) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-sm p-4">
      <BackLink href="/categories" label="Voltar para categorias" />
      <h1 className="mb-4 text-xl font-semibold">Editar categoria</h1>
      <EditCategoryForm
        categoryId={category.id}
        defaultValues={{ name: category.name }}
      />
    </main>
  );
}
