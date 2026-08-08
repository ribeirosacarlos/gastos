import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToDisplay } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";

export default async function CardsPage() {
  const user = await requireUser();

  const cards = await db.card.findMany({
    where: { ownerUserId: user.userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cartões</h1>
        <Link href="/cards/new" className={buttonVariants()}>
          Novo cartão
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum cartão cadastrado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/cards/${card.id}`}
                className="block rounded-lg border p-4 hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{card.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {card.bank}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>
                    Limite: {centsToDisplay(card.limitCents, card.currency)}
                  </span>
                  <span>
                    Fecha dia {card.closingDay} / Vence dia {card.dueDay}
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
