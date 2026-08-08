import Link from "next/link";
import { requireUser, getOtherUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string }>;
}) {
  const user = await requireUser();
  const { cardId } = await searchParams;

  const [purchases, otherUser, filterCard] = await Promise.all([
    db.purchase.findMany({
      where: {
        OR: [{ ownerUserId: user.userId }, { isShared: true }],
        ...(cardId ? { cardId } : {}),
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

      {filterCard && (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          Filtrando por{" "}
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: filterCard.color }}
            />
            {filterCard.name}
          </span>
          <Link href="/purchases" className="underline">
            limpar
          </Link>
        </p>
      )}

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filterCard
            ? "Nenhuma compra registrada nesse cartão ainda."
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
                  <span>{purchase.card.name}</span>
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
