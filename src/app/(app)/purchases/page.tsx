import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";

export default async function PurchasesPage() {
  const user = await requireUser();

  const purchases = await db.purchase.findMany({
    where: {
      OR: [{ ownerUserId: user.userId }, { isShared: true }],
    },
    include: { card: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Compras</h1>
        <Link href="/purchases/new" className={buttonVariants()}>
          Nova compra
        </Link>
      </div>

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma compra registrada ainda.
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
                      Compartilhada
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
