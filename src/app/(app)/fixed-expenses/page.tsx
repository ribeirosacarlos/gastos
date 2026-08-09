import Link from "next/link";
import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { categoryLabel, SUPPORTED_CATEGORIES } from "@/lib/categories";
import { buttonVariants } from "@/components/ui/button";
import { CategoryFilter } from "@/components/category-filter";
import { ensureRollingInstallments } from "@/lib/actions/fixed-expense-actions";

export default async function FixedExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireUser();
  const { category: rawCategory } = await searchParams;
  const category = SUPPORTED_CATEGORIES.some((c) => c.code === rawCategory)
    ? rawCategory
    : undefined;

  await ensureRollingInstallments();

  const [fixedExpenses, otherUser] = await Promise.all([
    db.fixedExpense.findMany({
      where: {
        OR: [{ ownerUserId: user.userId }, { isShared: true }],
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
        <CategoryFilter />
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
            <li key={fe.id}>
              <Link
                href={`/fixed-expenses/${fe.id}`}
                className="block rounded-lg border p-4 hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{fe.description}</span>
                  <div className="flex gap-1">
                    {fe.isShared && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        Compartilhada{otherUser ? ` com ${otherUser.name}` : ""}
                      </span>
                    )}
                    {!fe.isActive && (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        Inativa
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {categoryLabel(fe.category)} ·{" "}
                    {fe.totalInstallments
                      ? `${fe.totalInstallments}x`
                      : "Indefinido"}
                  </span>
                  <span>{centsToDisplay(fe.valueCents, fe.currency)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
