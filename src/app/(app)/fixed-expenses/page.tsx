import Link from "next/link";
import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { CategoryFilter } from "@/components/category-filter";
import { DeactivateFixedExpenseButton } from "@/components/deactivate-fixed-expense-button";
import { ensureRollingInstallments } from "@/lib/actions/fixed-expense-actions";

export default async function FixedExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  const { category: rawCategory } = await searchParams;

  const allCategories = await db.category.findMany({
    select: { id: true, name: true, isActive: true },
  });
  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));
  const activeCategories = allCategories.filter((c) => c.isActive);
  const category = categoryMap.has(rawCategory ?? "") ? rawCategory : undefined;

  await ensureRollingInstallments();

  const [fixedExpenses, otherUser] = await Promise.all([
    db.fixedExpense.findMany({
      where: {
        OR: [{ ownerUserId: user.userId }, { isShared: true }],
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    getOtherUser(user.userId),
  ]);

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gastos fixos</h1>
        <Link href="/fixed-expenses/new" className={buttonVariants()}>
          Novo gasto fixo
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CategoryFilter categories={activeCategories} />
      </div>

      {fixedExpenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {category
            ? "Nenhum gasto fixo registrado com essa categoria ainda."
            : "Nenhum gasto fixo registrado ainda."}
        </p>
      ) : (
        <ul className="space-y-2">
          {fixedExpenses.map((fe) => (
            <li key={fe.id} className="rounded-lg border p-4">
              <Link
                href={`/fixed-expenses/${fe.id}`}
                className="block hover:opacity-80"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{fe.description}</span>
                  {fe.isShared && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      Compartilhada{otherUser ? ` com ${otherUser.name}` : ""}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {categoryMap.get(fe.category) ?? fe.category} ·{" "}
                    {fe.totalInstallments
                      ? `${fe.totalInstallments}x`
                      : "Indefinido"}
                  </span>
                  <span>{centsToDisplay(fe.valueCents, fe.currency)}</span>
                </div>
              </Link>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/fixed-expenses/${fe.id}/edit`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Editar
                </Link>
                <DeactivateFixedExpenseButton fixedExpenseId={fe.id} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
