import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { CardList } from "./card-list";

export default async function CardsPage() {
  const user = await requireUser();

  const cards = await db.card.findMany({
    where: { ownerUserId: user.userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-4">
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
        <CardList cards={cards} />
      )}
    </main>
  );
}
