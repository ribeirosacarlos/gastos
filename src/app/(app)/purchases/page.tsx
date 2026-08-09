import Link from "next/link";
import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { categoryLabel, SUPPORTED_CATEGORIES } from "@/lib/categories";
import { buttonVariants } from "@/components/ui/button";
import { CategoryFilter } from "@/components/category-filter";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; category?: string }>;
}) {
  const user = await requireUser();
  const { cardId, category: rawCategory } = await searchParams;
  // Categoria invalida na URL (editada a mao, ou removida de
  // SUPPORTED_CATEGORIES no futuro) e ignorada, nao filtra pra lista vazia.
  const category = SUPPORTED_CATEGORIES.some((c) => c.code === rawCategory)
    ? rawCategory
    : undefined;

  const [purchases, otherUser, filterCard] = await Promise.all([
    db.purchase.findMany({
      where: {
        OR: [{ ownerUserId: user.userId }, { isShared: true }],
        ...(cardId ? { cardId } : {}),
        ...(category ? { category } : {}),
      },
      include: { card: true },
      orderBy: { createdAt: "desc" },
    }),
    getOtherUser(user.userId),
    cardId ? db.card.findUnique({ where: { id: cardId } }) : null,
  ]);

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Compras</h1>
        <Link href="/purchases/new" className={buttonVariants()}>
          Nova compra
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CategoryFilter />
      </div>

      {(filterCard || category) && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Filtrando por{" "}
          {filterCard && (
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: filterCard.color }}
              />
              {filterCard.name}
            </span>
          )}
          {category && (
            <span className="font-medium text-foreground">
              {categoryLabel(category)}
            </span>
          )}
          <Link href="/purchases" className="underline">
            limpar
          </Link>
        </p>
      )}

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filterCard || category
            ? "Nenhuma compra registrada com esse filtro ainda."
            : "Nenhuma compra registrada ainda."}
        </p>
      ) : (
        <ul className="space-y-2">
          {purchases.map((purchase) => (
            <li key={purchase.id}>
              <Link
                href={`/purchases/${purchase.id}`}
                className="block rounded-lg border p-4 hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{purchase.description}</span>
                  {purchase.isShared && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      Compartilhada{otherUser ? ` com ${otherUser.name}` : ""}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {purchase.card.name} · {categoryLabel(purchase.category)}
                  </span>
                  <span>
                    {centsToDisplay(purchase.totalCents, purchase.card.currency)}{" "}
                    em {purchase.installmentsCount}x
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
