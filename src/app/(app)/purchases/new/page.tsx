import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewPurchaseForm } from "./purchase-form";

export default async function NewPurchasePage() {
  const session = await requireUser();

  const [cards, user] = await Promise.all([
    db.card.findMany({
      where: { ownerUserId: session.userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: session.userId } }),
  ]);

  return (
    <main className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Nova compra</h1>
      <NewPurchaseForm
        cards={cards.map((c) => ({
          id: c.id,
          name: c.name,
          currency: c.currency,
        }))}
        defaultCardId={user?.lastUsedCardId ?? undefined}
      />
    </main>
  );
}
